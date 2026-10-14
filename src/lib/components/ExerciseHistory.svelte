<script lang="ts">
	import type { ChartConfiguration, Plugin } from 'chart.js';
	import { hitLogSummary, ratingLabel, setSummary } from '$lib/format';
	import { HIT_METHODS, hitMethod } from '$lib/hit';
	import type { Session } from '$lib/types';
	import { formatDate, kgToDisplay, type WeightUnit } from '$lib/units';
	import Chart from './Chart.svelte';
	import HitBadge from './HitBadge.svelte';
	import NotePoints from './NotePoints.svelte';
	import Rating from './Rating.svelte';

	let {
		sessions,
		unit,
		linkWorkouts = true
	}: { sessions: Session[]; unit: WeightUnit; linkWorkouts?: boolean } = $props();

	type Metric = 'top' | 'e1rm' | 'volume';
	type ChartRange = 1 | 3 | 6 | 12 | 'all';

	const CHART_RANGES: { value: ChartRange; label: string }[] = [
		{ value: 1, label: 'Last month' },
		{ value: 3, label: '3 months' },
		{ value: 6, label: '6 months' },
		{ value: 12, label: '1 year' },
		{ value: 'all', label: 'All' }
	];

	let metric = $state<Metric>('top');
	let chartRange = $state<ChartRange>('all');

	const RATING_COLORS = ['#a8b4c0', '#ff6b73', '#ffb224', '#5dff8a'];

	const chrono = $derived.by(() => {
		const entries = [...sessions].reverse();
		if (chartRange === 'all') return entries;

		const cutoff = new Date();
		cutoff.setHours(0, 0, 0, 0);
		const day = cutoff.getDate();
		cutoff.setDate(1);
		cutoff.setMonth(cutoff.getMonth() - chartRange);
		const lastDay = new Date(cutoff.getFullYear(), cutoff.getMonth() + 1, 0).getDate();
		cutoff.setDate(Math.min(day, lastDay));
		return entries.filter((session) => new Date(session.date) >= cutoff);
	});
	const toUnit = (kg: number | null) => (kg == null ? null : Number(kgToDisplay(kg, unit)));
	const visibleHitMethods = $derived.by(() => {
		const keys = new Set(
			chrono.flatMap((s) =>
				s.hits
					.filter((h) => h.logs.some((l) => l.completed && l.weightKg != null))
					.map((h) => h.methodKey)
			)
		);
		const known = HIT_METHODS.filter((method) => keys.delete(method.key));
		return [...known, ...[...keys].map(hitMethod)];
	});

	const best = $derived({
		top: Math.max(0, ...sessions.map((s) => s.topWeightKg ?? 0)),
		e1rm: Math.max(0, ...sessions.map((s) => s.bestE1rmKg ?? 0)),
		reps: Math.max(0, ...sessions.map((s) => s.totalReps))
	});

	const config = $derived.by((): ChartConfiguration => {
		const values = chrono.map((s) =>
			metric === 'top'
				? toUnit(s.topWeightKg)
				: metric === 'e1rm'
					? toUnit(s.bestE1rmKg)
					: toUnit(s.volumeKg)
		);
		const label =
			metric === 'top' ? `Top weight (${unit})` : metric === 'e1rm' ? `Est. 1RM (${unit})` : `Volume (${unit})`;
		const hitSeries =
			metric === 'top'
				? visibleHitMethods.map((method) => {
						const selected = chrono.map((session) =>
							session.hits
								.filter((hit) => hit.methodKey === method.key)
								.flatMap((hit) => hit.logs)
								.filter((log) => log.completed && log.weightKg != null)
								.sort(
									(a, b) =>
										(b.weightKg ?? 0) - (a.weightKg ?? 0) ||
										(b.reps ?? 0) - (a.reps ?? 0) ||
										(b.durationSec ?? 0) - (a.durationSec ?? 0)
								)[0]
						);
						return {
							method,
							labels: selected.map((log) =>
								!log
									? ''
									: method.key === 'isometric'
										? log.durationSec != null
											? `${log.durationSec}s`
											: ''
										: log.reps != null
											? `×${log.reps}`
											: ''
							),
							data: selected.map((log) => toUnit(log?.weightKg ?? null))
						};
					})
				: [];
		const hitLabelPlugin: Plugin = {
			id: 'hit-point-labels',
			afterDatasetsDraw: (chart) => {
				const ctx = chart.ctx;
				const occupied = new Map<string, number>();
				ctx.save();
				ctx.font = `600 11px ${getComputedStyle(document.body).fontFamily}`;
				ctx.textAlign = 'center';
				ctx.textBaseline = 'bottom';
				ctx.lineWidth = 3;
				ctx.strokeStyle = '#18212c';
				hitSeries.forEach((series, seriesIndex) => {
					const meta = chart.getDatasetMeta(seriesIndex + 2);
					meta.data.forEach((point, pointIndex) => {
						const text = series.labels[pointIndex];
						if (!text || series.data[pointIndex] == null) return;
						const key = `${Math.round(point.x)}:${Math.round(point.y)}`;
						const stack = occupied.get(key) ?? 0;
						occupied.set(key, stack + 1);
						const y = point.y - 9 - stack * 13;
						ctx.strokeText(text, point.x, y);
						ctx.fillStyle = series.method.color;
						ctx.fillText(text, point.x, y);
					});
				});
				ctx.restore();
			}
		};
		return {
			type: 'bar',
			plugins: [hitLabelPlugin],
			data: {
				labels: chrono.map((s) => formatDate(s.date, { weekday: undefined })),
				datasets: [
					{
						type: 'line',
						label,
						data: values,
						yAxisID: 'y',
						borderColor: '#e8eee9',
						borderWidth: 2.5,
						tension: 0.25,
						pointRadius: 7,
						pointHoverRadius: 9,
						pointBorderWidth: 2.5,
						pointBorderColor: chrono.map((s) =>
							s.rating === 3 ? RATING_COLORS[3] : '#e8eee9'
						),
						pointBackgroundColor: chrono.map((s) => RATING_COLORS[s.rating ?? 0]),
						spanGaps: true,
						order: 0
					},
					{
						type: 'bar',
						label: 'Reps',
						data: chrono.map((s) => s.totalReps),
						yAxisID: 'reps',
						backgroundColor: 'rgba(47, 123, 255, 0.45)',
						borderRadius: 3,
						order: 1
					},
					...hitSeries.map(({ method, data }) => ({
						type: 'line' as const,
						label: method.short,
						data,
						yAxisID: 'y',
						showLine: false,
						spanGaps: false,
						pointStyle: 'circle' as const,
						pointRadius: 9,
						pointHoverRadius: 11,
						pointBorderWidth: 2.5,
						pointBackgroundColor: 'transparent',
						pointBorderColor: method.color,
						order: -1
					}))
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				layout: { padding: { top: 10, right: 8 } },
				interaction: { mode: 'index', intersect: false },
				plugins: {
					legend: { display: false },
					tooltip: {
						filter: (item) => item.datasetIndex < 2,
						callbacks: {
							afterBody: (items) => {
								const s = chrono[items[0]?.dataIndex ?? -1];
								if (!s) return '';
								const details = s.hits.flatMap((hit) => {
									const method = hitMethod(hit.methodKey);
									return hit.logs
										.filter((log) => log.completed)
										.map((log) => `${method.short} ${hitLogSummary(hit.methodKey, log, unit)}`);
								});
								if (s.rating) details.unshift(`Rating: ${ratingLabel(s.rating)}`);
								return details;
							}
						}
					}
				},
				scales: {
					x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12 } },
					y: { position: 'left', grid: { color: '#243040' }, beginAtZero: false },
					reps: { position: 'right', grid: { display: false }, beginAtZero: true }
				}
			}
		};
	});
</script>

{#if sessions.length === 0}
	<p class="empty">No completed sessions yet. History and graphs appear after your first workout.</p>
{:else}
	<div class="stats">
		<div><span class="eyebrow">Sessions</span><strong class="num">{sessions.length}</strong></div>
		<div>
			<span class="eyebrow">Best weight</span>
			<strong class="num">{kgToDisplay(best.top, unit)}<small>{unit}</small></strong>
		</div>
		<div>
			<span class="eyebrow">Est. 1RM</span>
			<strong class="num">{kgToDisplay(best.e1rm, unit)}<small>{unit}</small></strong>
		</div>
		<div><span class="eyebrow">Most reps</span><strong class="num">{best.reps}</strong></div>
	</div>

	{#if sessions.length > 1}
		<div class="chart-card">
			<div class="chart-controls">
				<div class="metric" role="tablist">
					{#each [['top', 'Weight'], ['e1rm', 'Est. 1RM'], ['volume', 'Volume']] as [k, l] (k)}
						<button type="button" role="tab" aria-selected={metric === k} onclick={() => (metric = k as Metric)}>
							{l}
						</button>
					{/each}
				</div>
				<div class="range-picks" role="group" aria-label="Chart date range">
					{#each CHART_RANGES as range (range.value)}
						<button
							type="button"
							aria-pressed={chartRange === range.value}
							onclick={() => (chartRange = range.value)}>{range.label}</button
						>
					{/each}
				</div>
			</div>
			{#if chrono.length > 1}
				<Chart {config} />
			{:else}
				<p class="chart-empty">Not enough sessions in this date range.</p>
			{/if}
			<div class="legend">
				<span><i class="line"></i>{metric === 'volume' ? 'Volume' : metric === 'e1rm' ? 'Est. 1RM' : 'Top weight'}</span>
				<span><i class="bar"></i>Total reps</span>
				{#if metric === 'top'}
					{#each visibleHitMethods as method (method.key)}
						<span><i class="hit-key" style:border-color={method.color}></i>{method.short}</span>
					{/each}
				{/if}
				<span class="dots">
					Rating
					<i style:background={RATING_COLORS[1]}></i>1
					<i style:background={RATING_COLORS[2]}></i>2
					<i style:background={RATING_COLORS[3]}></i>3
				</span>
			</div>
		</div>
	{/if}

	<ol class="sessions">
		{#each sessions as s (s.workoutExerciseId)}
			<li>
				<header>
					<div>
						<strong>{formatDate(s.date, { year: 'numeric' })}</strong>
						{#if linkWorkouts}
							<a class="muted" href="/history/{s.workoutId}">{s.workoutName}</a>
						{:else}
							<span class="muted">{s.workoutName}</span>
						{/if}
					</div>
					<Rating value={s.rating} />
				</header>

				{#if s.cableHeight || s.seatHeight || s.support || s.repRange}
					<p class="extras">
						{#if s.repRange}<span>Reps {s.repRange}</span>{/if}
						{#if s.cableHeight}<span>Weight height {s.cableHeight}</span>{/if}
						{#if s.seatHeight}<span>Seat {s.seatHeight}</span>{/if}
						{#if s.support}<span>Support {s.support}</span>{/if}
					</p>
				{/if}

				<ul class="sets">
					{#each s.sets as set, i (set.id)}
						<li class:warm={set.type === 'warmup'}>
							<span class="idx">{set.type === 'warmup' ? 'W' : set.type === 'failure' ? 'F' : i + 1}</span>
							<span class="num">{setSummary(set, unit)}</span>
						</li>
					{/each}
				</ul>

				{#each s.hits as h (h.id)}
					<div class="hit">
						<HitBadge method={h.methodKey} />
						<span class="num">
							{h.logs.map((l) => hitLogSummary(h.methodKey, l, unit)).join('  ·  ') || 'No entries'}
						</span>
					</div>
				{/each}

				{#if s.notes}<div class="note"><NotePoints notes={s.notes} /></div>{/if}
			</li>
		{/each}
	</ol>
{/if}

<style>
	.stats {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 1px;
		margin-bottom: 1rem;
		border: 1.5px solid var(--ink);
		border-radius: var(--radius);
		background: var(--ink);
		overflow: hidden;
	}
	.stats div {
		display: grid;
		gap: 0.1rem;
		padding: 0.6rem 0.7rem;
		background: var(--surface);
	}
	.stats strong {
		font-size: 1.35rem;
		font-stretch: 115%;
		font-weight: 800;
	}
	.stats small {
		margin-left: 2px;
		font-size: 0.7rem;
		color: var(--steel);
	}
	.chart-card {
		margin-bottom: 1.25rem;
		padding: 0.75rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.chart-controls {
		display: flex;
		align-items: start;
		justify-content: space-between;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
	}
	.metric {
		display: inline-flex;
		padding: 3px;
		border-radius: 8px;
		background: var(--paper-2);
	}
	.metric button {
		padding: 0.3rem 0.7rem;
		border: 0;
		border-radius: 6px;
		background: transparent;
		font: inherit;
		font-size: 0.85rem;
		font-weight: 700;
		cursor: pointer;
	}
	.metric button[aria-selected='true'] {
		background: var(--chrome);
		color: var(--lime);
	}
	.range-picks {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.range-picks button {
		padding: 0.3rem 0.65rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: transparent;
		color: var(--steel);
		font: inherit;
		font-size: 0.78rem;
		font-weight: 700;
		cursor: pointer;
	}
	.range-picks button[aria-pressed='true'] {
		border-color: var(--ink);
		background: var(--ink);
		color: var(--surface);
	}
	.chart-empty {
		display: grid;
		min-height: 220px;
		margin: 0;
		place-items: center;
		color: var(--steel);
		font-size: 0.9rem;
	}
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.9rem;
		margin-top: 0.5rem;
		font-size: 0.75rem;
		color: var(--steel);
	}
	.legend span {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}
	.legend i {
		display: inline-block;
	}
	.legend .line {
		width: 16px;
		height: 3px;
		background: var(--ink);
	}
	.legend .bar {
		width: 10px;
		height: 10px;
		background: rgba(47, 123, 255, 0.8);
	}
	.legend .hit-key {
		width: 9px;
		height: 9px;
		border: 2px solid;
		border-radius: 50%;
		background: transparent !important;
	}
	.legend .dots i {
		width: 9px;
		height: 9px;
		border-radius: 50%;
		margin-left: 0.3rem;
	}
	.sessions {
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.sessions > li {
		padding: 0.9rem 0;
		border-top: 1px solid var(--line);
	}
	.sessions header {
		display: flex;
		justify-content: space-between;
		align-items: start;
		gap: 1rem;
		margin-bottom: 0.4rem;
	}
	.sessions header div {
		display: grid;
	}
	.sessions header a {
		font-size: 0.85rem;
	}
	.extras {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.4rem;
	}
	.extras span {
		padding: 0.1rem 0.45rem;
		border-radius: 4px;
		background: var(--paper-2);
		font-size: 0.78rem;
		font-weight: 650;
	}
	.sets {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.15rem;
	}
	.sets li {
		display: flex;
		gap: 0.7rem;
	}
	.sets .idx {
		width: 1.2rem;
		font-weight: 800;
		color: var(--steel);
	}
	.sets .warm {
		color: var(--steel);
	}
	.hit {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.35rem;
		font-size: 0.9rem;
	}
	.note {
		margin-top: 0.4rem;
		font-size: 0.88rem;
		font-style: italic;
		color: var(--ink-2);
	}
	@media (max-width: 480px) {
		.stats {
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
