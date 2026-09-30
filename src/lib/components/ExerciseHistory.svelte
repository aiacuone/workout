<script lang="ts">
	import type { ChartConfiguration } from 'chart.js';
	import { hitLogSummary, ratingLabel, setSummary } from '$lib/format';
	import type { Session } from '$lib/types';
	import { formatDate, kgToDisplay, type WeightUnit } from '$lib/units';
	import Chart from './Chart.svelte';
	import HitBadge from './HitBadge.svelte';
	import Rating from './Rating.svelte';

	let {
		sessions,
		unit,
		linkWorkouts = true
	}: { sessions: Session[]; unit: WeightUnit; linkWorkouts?: boolean } = $props();

	type Metric = 'top' | 'e1rm' | 'volume';
	let metric = $state<Metric>('top');

	const RATING_COLORS = ['#a8b4c0', '#ff6b73', '#ffb224', '#5dff8a'];

	const chrono = $derived([...sessions].reverse().slice(-30));
	const toUnit = (kg: number | null) => (kg == null ? null : Number(kgToDisplay(kg, unit)));

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
		return {
			type: 'bar',
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
						pointRadius: chrono.map((s) => (s.rating === 3 ? 7 : 5)),
						pointHoverRadius: chrono.map((s) => (s.rating === 3 ? 9 : 7)),
						pointBorderWidth: chrono.map((s) => (s.rating === 3 ? 2.5 : 1)),
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
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							afterBody: (items) => {
								const s = chrono[items[0]?.dataIndex ?? -1];
								return s?.rating ? `Rating: ${ratingLabel(s.rating)}` : '';
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
			<div class="metric" role="tablist">
				{#each [['top', 'Weight'], ['e1rm', 'Est. 1RM'], ['volume', 'Volume']] as [k, l] (k)}
					<button type="button" role="tab" aria-selected={metric === k} onclick={() => (metric = k as Metric)}>
						{l}
					</button>
				{/each}
			</div>
			<Chart {config} />
			<div class="legend">
				<span><i class="line"></i>{metric === 'volume' ? 'Volume' : metric === 'e1rm' ? 'Est. 1RM' : 'Top weight'}</span>
				<span><i class="bar"></i>Total reps</span>
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

				{#if s.cableHeight || s.seatHeight || s.repRange}
					<p class="extras">
						{#if s.repRange}<span>Reps {s.repRange}</span>{/if}
						{#if s.cableHeight}<span>Weight height {s.cableHeight}</span>{/if}
						{#if s.seatHeight}<span>Seat {s.seatHeight}</span>{/if}
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

				{#if s.notes}<p class="note">{s.notes}</p>{/if}
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
	.metric {
		display: inline-flex;
		margin-bottom: 0.5rem;
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
