<script lang="ts">
	import type { ChartConfiguration } from 'chart.js';
	import { enhance } from '$app/forms';
	import Chart from '$lib/components/Chart.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Sheet from '$lib/components/Sheet.svelte';
	import { navyBodyFat } from '$lib/bodyfat';
	import {
		MEASUREMENT_FIELDS,
		measurementDelta,
		measurementFieldOptional,
		totalGirthCm,
		type MeasurementChange,
		type MeasurementKey
	} from '$lib/measurements';
	import { toastFormError } from '$lib/toast.svelte';
	import { cmToDisplay, displayToCm, kgToDisplay } from '$lib/units';

	let { data } = $props();

	type Entry = (typeof data.entries)[number];

	const wu = $derived(data.prefs?.weightUnit ?? 'kg');
	const lu = $derived(data.prefs?.lengthUnit ?? 'cm');
	const sex = $derived(data.prefs?.sex ?? 'male');

	let weightOpen = $state(false);
	let caloriesOpen = $state(false);
	let measureOpen = $state(false);
	let compareOpen = $state(false);
	let editing = $state<Entry | null>(null);
	let vals = $state<Record<string, string>>({});
	let placeholders = $state<Entry | null>(null);

	const newest = $derived([...data.entries].reverse());
	const latestWeight = $derived(newest.find((e) => e.weightKg != null) ?? null);
	const latestCalories = $derived(newest.find((e) => e.calories != null) ?? null);
	const latestBf = $derived(newest.find((e) => e.bodyFatPct != null) ?? null);
	const firstBf = $derived(data.entries.find((e) => e.bodyFatPct != null) ?? null);
	const latestMeasure = $derived(
		newest.find((e) => MEASUREMENT_FIELDS.some((f) => e[f.key] != null) || e.bodyFatPct != null) ?? null
	);
	const latestSummary = $derived(newest.find((e) => isCompleteSet(e)) ?? null);

	const preview = $derived(
		navyBodyFat({
			sex,
			heightCm: displayToCm(vals.height, lu),
			neckCm: displayToCm(vals.neckCm, lu),
			waistCm: displayToCm(vals.waistCm, lu),
			hipsCm: displayToCm(vals.hipsCm, lu)
		})
	);

	function today() {
		const d = new Date();
		return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	}

	function isCompleteSet(e: Entry) {
		return MEASUREMENT_FIELDS.every((f) => measurementFieldOptional(f) || e[f.key] != null);
	}

	function hasMeasure(e: Entry) {
		return MEASUREMENT_FIELDS.some((f) => e[f.key] != null) || e.bodyFatPct != null;
	}

	function isWeightOnly(e: Entry) {
		return e.weightKg != null && e.calories == null && !hasMeasure(e);
	}

	function isCaloriesOnly(e: Entry) {
		return e.calories != null && e.weightKg == null && !hasMeasure(e);
	}

	function openWeight(entry: Entry | null = null) {
		editing = entry;
		vals = {
			measuredOn: entry?.measuredOn ?? today(),
			weight: entry ? kgToDisplay(entry.weightKg, wu) : '',
			notes: entry?.notes ?? ''
		};
		placeholders = entry ?? latestWeight;
		weightOpen = true;
	}

	function openCalories(entry: Entry | null = null) {
		editing = entry;
		vals = {
			measuredOn: entry?.measuredOn ?? today(),
			calories: entry?.calories != null ? String(entry.calories) : '',
			notes: entry?.notes ?? ''
		};
		placeholders = entry ?? latestCalories;
		caloriesOpen = true;
	}

	function openMeasure(entry: Entry | null = null) {
		editing = entry;
		const base = entry ?? latestMeasure;
		const v: Record<string, string> = {
			measuredOn: entry?.measuredOn ?? today(),
			height: cmToDisplay(entry?.heightCm ?? data.prefs?.heightCm, lu),
			notes: entry?.notes ?? ''
		};
		for (const f of MEASUREMENT_FIELDS) v[f.key] = entry ? cmToDisplay(entry[f.key], lu) : '';
		vals = v;
		placeholders = base;
		measureOpen = true;
	}

	function openEntry(e: Entry) {
		if (isCaloriesOnly(e)) openCalories(e);
		else if (isWeightOnly(e)) openWeight(e);
		else openMeasure(e);
	}

	function delta(key: MeasurementKey | 'weightKg' | 'bodyFatPct' | 'calories', e: Entry) {
		const idx = data.entries.indexOf(e);
		const prev = data.entries
			.slice(0, idx)
			.reverse()
			.find((x) => x[key] != null);
		if (prev == null || e[key] == null) return null;
		return (e[key] as number) - (prev[key] as number);
	}

	function fmtDelta(d: number | null, conv: (n: number) => string) {
		if (d == null || Math.abs(d) < 0.05) return '';
		return `${d > 0 ? '+' : '−'}${conv(Math.abs(d))}`;
	}

	const CHART_SERIES = [
		{ id: 'weightKg', label: 'Weight', axis: 'w', color: '#e8eee9', fill: false },
		{ id: 'calories', label: 'Calories', axis: 'kcal', color: '#ffb84d', fill: false },
		{ id: 'bodyFatPct', label: 'Body fat', axis: 'bf', color: '#2f7bff', fill: true },
		{ id: 'totalCm', label: 'Total', axis: 'cm', color: '#facc15', fill: false },
		{ id: 'neckCm', label: 'Neck', axis: 'cm', color: '#6ba3ff', fill: false },
		{ id: 'shouldersCm', label: 'Shoulders', axis: 'cm', color: '#c084fc', fill: false },
		{ id: 'chestCm', label: 'Chest', axis: 'cm', color: '#f76b15', fill: false },
		{ id: 'bicepLCm', label: 'Bicep L', axis: 'cm', color: '#ff6b73', fill: false },
		{ id: 'bicepRCm', label: 'Bicep R', axis: 'cm', color: '#ff8fab', fill: false },
		{ id: 'waistCm', label: 'Waist', axis: 'cm', color: '#30d158', fill: false },
		{ id: 'hipsCm', label: 'Hips', axis: 'cm', color: '#ffb224', fill: false },
		{ id: 'thighLCm', label: 'Thigh L', axis: 'cm', color: '#22d3ee', fill: false },
		{ id: 'thighRCm', label: 'Thigh R', axis: 'cm', color: '#2dd4bf', fill: false },
		{ id: 'calfLCm', label: 'Calf L', axis: 'cm', color: '#a3e635', fill: false },
		{ id: 'calfRCm', label: 'Calf R', axis: 'cm', color: '#84cc16', fill: false }
	] as const;

	type SeriesId = (typeof CHART_SERIES)[number]['id'];

	function seriesNumber(e: Entry, id: SeriesId): number | null {
		if (id === 'totalCm') return totalGirthCm(e);
		const value = e[id];
		return value == null ? null : value;
	}

	const available = $derived(CHART_SERIES.filter((s) => data.entries.some((e) => seriesNumber(e, s.id) != null)));

	let picked = $state<SeriesId[] | null>(null);

	const active = $derived.by(() => {
		const ids = new Set(available.map((s) => s.id));
		let fallback: SeriesId[] = ids.has('bodyFatPct')
			? ['bodyFatPct']
			: ids.has('weightKg')
				? ['weightKg']
				: available.map((s) => s.id);
		if (ids.has('totalCm') && !fallback.includes('totalCm')) fallback = [...fallback, 'totalCm'];
		const chosen = (picked ?? fallback).filter((id) => ids.has(id));
		return chosen.length ? chosen : fallback;
	});

	function toggleSeries(id: SeriesId) {
		if (active.includes(id)) {
			if (active.length === 1) return;
			picked = active.filter((x) => x !== id);
		} else {
			picked = [...active, id];
		}
	}

	const chartEntries = $derived(data.entries.filter((e) => active.some((id) => seriesNumber(e, id) != null)));

	const config = $derived.by((): ChartConfiguration => {
		const on = new Set(active);
		const series = available.filter((s) => on.has(s.id));
		const show = (axis: 'w' | 'bf' | 'cm' | 'kcal') => series.some((s) => s.axis === axis);
		const pointRadius = chartEntries.length > 18 ? 0 : 3;
		const scales: NonNullable<ChartConfiguration['options']>['scales'] = {
			x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12 } }
		};
		const axes = (['cm', 'w', 'kcal', 'bf'] as const).filter((axis) => show(axis));
		for (const [i, axis] of axes.entries()) {
			const position = i === 0 ? 'left' : 'right';
			const grid = { display: i === 0, color: '#243040', drawOnChartArea: i === 0 };
			if (axis === 'cm')
				scales.cm = {
					axis: 'y',
					position,
					stack: axis,
					beginAtZero: false,
					grid,
					title: { display: true, text: lu }
				};
			else if (axis === 'w')
				scales.w = {
					axis: 'y',
					position,
					stack: axis,
					beginAtZero: false,
					grid,
					title: { display: true, text: wu }
				};
			else if (axis === 'kcal')
				scales.kcal = {
					axis: 'y',
					position,
					stack: axis,
					beginAtZero: false,
					grid,
					title: { display: true, text: 'kcal' }
				};
			else
				scales.bf = {
					axis: 'y',
					position,
					stack: axis,
					beginAtZero: false,
					grid,
					ticks: { callback: (v) => `${v}%` }
				};
		}

		return {
			type: 'line',
			data: {
				labels: chartEntries.map((e) =>
					new Date(e.measuredOn + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
				),
				datasets: series.map((s) => ({
					label:
						s.axis === 'w'
							? `Weight (${wu})`
							: s.axis === 'kcal'
								? 'Calories (kcal)'
								: s.axis === 'cm'
									? `${s.label} (${lu})`
									: 'Body fat %',
					data: chartEntries.map((e) => {
						const v = seriesNumber(e, s.id);
						if (v == null) return null;
						if (s.axis === 'w') return Number(kgToDisplay(v, wu));
						if (s.axis === 'cm') return Number(cmToDisplay(v, lu));
						return v;
					}),
					yAxisID: s.axis,
					order: s.fill ? 0 : 1,
					borderColor: s.color,
					backgroundColor: s.fill ? 'rgba(47, 123, 255, 0.18)' : s.color,
					fill: s.fill,
					borderWidth: 2.5,
					tension: 0.3,
					spanGaps: true,
					pointRadius,
					pointHoverRadius: 4
				}))
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				plugins: { legend: { display: false } },
				scales
			}
		};
	});

	const closeSheet = () => {
		editing = null;
	};

	type CompareRow = {
		label: string;
		current: string;
		currentWhen: string;
		prior: {
			when: string;
			value: string;
			change: MeasurementChange;
			amount: string;
		} | null;
	};

	let compareRows = $state<CompareRow[]>([]);

	function sessionWhen(iso: string, sessions: { measuredOn: string }[]) {
		const monthDay = iso.slice(5);
		const years = new Set(sessions.map((s) => s.measuredOn.slice(0, 4)));
		const clash = sessions.filter((s) => s.measuredOn.slice(5) === monthDay).length > 1;
		return new Date(iso + 'T00:00').toLocaleDateString(undefined, {
			day: 'numeric',
			month: 'short',
			year: clash || years.size > 1 ? 'numeric' : undefined
		});
	}

	function latestPrior(entries: Entry[], excludeId: string | null, measuredOn: string, key: MeasurementKey) {
		return (
			entries
				.filter((e) => {
					if (excludeId && e.id === excludeId) return false;
					if (e.measuredOn > measuredOn) return false;
					return e[key] != null;
				})
				.at(-1) ?? null
		);
	}

	function buildComparison(
		entries: Entry[],
		excludeId: string | null,
		measuredOn: string,
		current: Partial<Record<MeasurementKey, number | null>>
	) {
		const format = (n: number) => cmToDisplay(n, lu);
		const currentWhen = sessionWhen(measuredOn, [{ measuredOn }]);
		compareRows = MEASUREMENT_FIELDS.flatMap((f) => {
			const value = current[f.key];
			if (value == null) return [];
			const prior = latestPrior(entries, excludeId, measuredOn, f.key);
			const delta = prior ? measurementDelta(value, prior[f.key], format) : null;
			return [
				{
					label: f.label,
					current: format(value),
					currentWhen,
					prior:
						prior && delta
							? {
									when: sessionWhen(prior.measuredOn, [prior, { measuredOn }]),
									value: format(prior[f.key] as number),
									...delta
								}
							: null
				}
			];
		});
	}

	function openLastSummary() {
		const entry = latestSummary;
		if (!entry) return;
		buildComparison(
			data.entries,
			entry.id,
			entry.measuredOn,
			Object.fromEntries(MEASUREMENT_FIELDS.map((f) => [f.key, entry[f.key]]))
		);
		compareOpen = true;
	}
</script>

<svelte:head><title>Measurements · Strongr</title></svelte:head>

<div class="page">
	<div class="page-head">
		<div>
			<p class="eyebrow">Body</p>
			<h1>Measurements</h1>
		</div>
		<div class="actions">
			{#if latestSummary}
				<button class="btn" type="button" onclick={openLastSummary}>
					<Icon name="list" size={18} />Last summary
				</button>
			{/if}
			<button class="btn" onclick={() => openWeight()}><Icon name="plus" size={18} />Weight</button>
			<button class="btn" onclick={() => openCalories()}><Icon name="plus" size={18} />Calories</button>
			<button class="btn primary" onclick={() => openMeasure()}><Icon name="plus" size={18} />Measure</button>
		</div>
	</div>

	<section class="summary">
		<button type="button" class="bf" onclick={() => openMeasure()}>
			<span class="eyebrow">Body fat · US Navy</span>
			{#if latestBf}
				<strong class="num">{latestBf.bodyFatPct}<small>%</small></strong>
				{#if firstBf && firstBf !== latestBf && firstBf.bodyFatPct != null && latestBf.bodyFatPct != null}
					<span class="chg num">
						{fmtDelta(latestBf.bodyFatPct - firstBf.bodyFatPct, (n) => n.toFixed(1) + ' pts')} since {new Date(
							firstBf.measuredOn + 'T00:00'
						).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}
					</span>
				{/if}
			{:else}
				<strong>—</strong>
				<span class="chg">Tap to log neck, waist{sex === 'female' ? ', hips' : ''} and height.</span>
			{/if}
		</button>
		<button type="button" class="wt" onclick={() => openWeight()}>
			<span class="eyebrow">Weight</span>
			{#if latestWeight?.weightKg != null}
				<strong class="num">{kgToDisplay(latestWeight.weightKg, wu)}<small>{wu}</small></strong>
			{:else}
				<strong>—</strong>
			{/if}
			<span class="chg muted">Tap to log weight</span>
		</button>
		<button type="button" class="wt" onclick={() => openCalories()}>
			<span class="eyebrow">Calories</span>
			{#if latestCalories?.calories != null}
				<strong class="num">{latestCalories.calories.toLocaleString()}<small>kcal</small></strong>
			{:else}
				<strong>—</strong>
			{/if}
			<span class="chg muted">Tap to log calories</span>
		</button>
	</section>

	{#if available.length && chartEntries.length > 1}
		<div class="chart-card">
			<div class="picks" role="group" aria-label="Measurements on the chart">
				{#each available as s (s.id)}
					<button type="button" aria-pressed={active.includes(s.id)} onclick={() => toggleSeries(s.id)}>
						<i style:background={s.color}></i>{s.id === 'totalCm' ? `Total ${lu}` : s.label}
					</button>
				{/each}
			</div>
			<Chart {config} height={230} />
		</div>
	{/if}

	<section class="section">
		<h2>Entries</h2>
		{#if newest.length}
			<ul class="entries">
				{#each newest as e (e.id)}
					<li>
						<button type="button" class="entry" onclick={() => openEntry(e)}>
							<div class="entry-head">
								<strong
									>{new Date(e.measuredOn + 'T00:00').toLocaleDateString(undefined, {
										weekday: 'short',
										day: 'numeric',
										month: 'short',
										year: 'numeric'
									})}</strong
								>
								{#if isWeightOnly(e)}
									<span class="tag">Weight</span>
								{:else if isCaloriesOnly(e)}
									<span class="tag">Calories</span>
								{:else if e.bodyFatPct != null}
									<span class="pill num"
										>{e.bodyFatPct}% <em>{fmtDelta(delta('bodyFatPct', e), (n) => n.toFixed(1))}</em></span
									>
								{:else}
									<span class="tag">Measure</span>
								{/if}
							</div>
							<dl>
								{#if e.weightKg != null}
									<div>
										<dt>Weight</dt>
										<dd class="num">
											{kgToDisplay(e.weightKg, wu)}
											{wu}
											<em>{fmtDelta(delta('weightKg', e), (n) => kgToDisplay(n, wu))}</em>
										</dd>
									</div>
								{/if}
								{#if e.calories != null}
									<div>
										<dt>Calories</dt>
										<dd class="num">
											{e.calories.toLocaleString()}
											kcal
											<em>{fmtDelta(delta('calories', e), (n) => Math.round(n).toLocaleString())}</em>
										</dd>
									</div>
								{/if}
								{#each MEASUREMENT_FIELDS as f (f.key)}
									{#if e[f.key] != null}
										<div>
											<dt>{f.label}</dt>
											<dd class="num">
												{cmToDisplay(e[f.key], lu)}
												{lu}
												<em>{fmtDelta(delta(f.key, e), (n) => cmToDisplay(n, lu))}</em>
											</dd>
										</div>
									{/if}
								{/each}
							</dl>
							{#if e.notes}<p class="muted note">{e.notes}</p>{/if}
						</button>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="empty">No entries yet. Log weight, calories, and measurements separately whenever you take them.</p>
		{/if}
	</section>
</div>

<Sheet
	bind:open={weightOpen}
	title={editing ? 'Edit weight' : 'Log weight'}
	onclose={closeSheet}
>
	<form
		method="POST"
		action="?/saveWeight"
		class="stack"
		use:enhance={() =>
			async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'failure') toastFormError(result.data);
				if (result.type === 'success') weightOpen = false;
			}}
	>
		{#if editing}<input type="hidden" name="id" value={editing.id} />{/if}
		<label class="field">Date<input type="date" name="measuredOn" required bind:value={vals.measuredOn} /></label>
		<label class="field">
			Weight ({wu})
			<input
				name="weight"
				inputmode="decimal"
				required
				data-autofocus
				placeholder={kgToDisplay(placeholders?.weightKg, wu)}
				bind:value={vals.weight}
			/>
		</label>
		<label class="field">Notes<textarea name="notes" rows="2" bind:value={vals.notes}></textarea></label>
		<button class="btn primary block">{editing ? 'Save weight' : 'Log weight'}</button>
	</form>
	{#if editing}
		<form
			method="POST"
			action="?/delete"
			class="del"
			use:enhance={() =>
				async ({ update }) => {
					await update();
					weightOpen = false;
				}}
		>
			<input type="hidden" name="id" value={editing.id} />
			<button
				class="btn danger block"
				onclick={(ev) => {
					if (!confirm('Delete this entry?')) ev.preventDefault();
				}}>Delete entry</button
			>
		</form>
	{/if}
	</Sheet>

	<Sheet
		bind:open={caloriesOpen}
		title={editing ? 'Edit calories' : 'Log calories'}
		onclose={closeSheet}
	>
		<form
			method="POST"
			action="?/saveCalories"
			class="stack"
			use:enhance={() =>
				async ({ result, update }) => {
					await update({ reset: false });
					if (result.type === 'failure') toastFormError(result.data);
					if (result.type === 'success') caloriesOpen = false;
				}}
		>
			{#if editing}<input type="hidden" name="id" value={editing.id} />{/if}
			<label class="field">Date<input type="date" name="measuredOn" required bind:value={vals.measuredOn} /></label>
			<label class="field">
				Calories (kcal)
				<input
					name="calories"
					inputmode="numeric"
					required
					data-autofocus
					placeholder={placeholders?.calories != null ? String(placeholders.calories) : ''}
					bind:value={vals.calories}
				/>
			</label>
			<label class="field">Notes<textarea name="notes" rows="2" bind:value={vals.notes}></textarea></label>
			<button class="btn primary block">{editing ? 'Save calories' : 'Log calories'}</button>
		</form>
		{#if editing}
			<form
				method="POST"
				action="?/delete"
				class="del"
				use:enhance={() =>
					async ({ update }) => {
						await update();
						caloriesOpen = false;
					}}
			>
				<input type="hidden" name="id" value={editing.id} />
				<button
					class="btn danger block"
					onclick={(ev) => {
						if (!confirm('Delete this entry?')) ev.preventDefault();
					}}>Delete entry</button
				>
			</form>
		{/if}
	</Sheet>

	<Sheet
		bind:open={measureOpen}
	title={editing ? 'Edit measurements' : 'Log measurements'}
	onclose={closeSheet}
>
	<form
		method="POST"
		action="?/saveMeasurements"
		class="stack"
		use:enhance={() => {
			const entries = data.entries;
			const excludeId = editing?.id ?? null;
			const measuredOn = vals.measuredOn;
			const current = Object.fromEntries(
				MEASUREMENT_FIELDS.map((f) => [f.key, displayToCm(vals[f.key], lu)])
			) as Record<MeasurementKey, number | null>;
			const complete = MEASUREMENT_FIELDS.every((f) => measurementFieldOptional(f) || current[f.key] != null);
			return async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'failure') toastFormError(result.data);
				if (result.type === 'success') {
					measureOpen = false;
					if (complete) {
						buildComparison(entries, excludeId, measuredOn, current);
						compareOpen = true;
					}
				}
			};
		}}
	>
		{#if editing}<input type="hidden" name="id" value={editing.id} />{/if}

		<div class="bf-preview" class:ready={preview != null}>
			<span class="eyebrow">Body fat estimate</span>
			<strong class="num">{preview != null ? `${preview}%` : '—'}</strong>
			<span class="muted">
				US Navy method · {sex}{sex === 'female' ? ' (neck, waist, hips, height)' : ' (neck, waist, height)'} ·
				<a href="/settings">change</a>
			</span>
		</div>

		<div class="grid">
			<label class="field">Date<input type="date" name="measuredOn" required bind:value={vals.measuredOn} /></label>
			<label class="field"
				>Height ({lu})<input
					name="height"
					inputmode="decimal"
					bind:value={vals.height}
					placeholder="needed for BF%"
				/></label
			>
			{#each MEASUREMENT_FIELDS as f (f.key)}
				<label class="field" class:bf-field={'bf' in f && (f.key !== 'hipsCm' || sex === 'female')}>
					{f.label} ({lu}{measurementFieldOptional(f) ? ', optional' : ''})
					<input
						name={f.key}
						inputmode="decimal"
						placeholder={cmToDisplay(placeholders?.[f.key], lu) || ('hint' in f ? f.hint : '')}
						bind:value={vals[f.key]}
					/>
				</label>
			{/each}
		</div>
		<label class="field">Notes<textarea name="notes" rows="2" bind:value={vals.notes}></textarea></label>
		<button class="btn primary block">{editing ? 'Save changes' : 'Save measurements'}</button>
	</form>
	{#if editing}
		<form
			method="POST"
			action="?/delete"
			class="del"
			use:enhance={() =>
				async ({ update }) => {
					await update();
					measureOpen = false;
				}}
		>
			<input type="hidden" name="id" value={editing.id} />
			<button
				class="btn danger block"
				onclick={(ev) => {
					if (!confirm('Delete this entry?')) ev.preventDefault();
				}}>Delete entry</button
			>
		</form>
	{/if}
</Sheet>

<Sheet bind:open={compareOpen} title="Since your last measurements">
	{#if compareRows.every((row) => row.prior == null)}
		<p class="compare-empty">This is the first full set, so there’s nothing earlier to compare.</p>
	{/if}
	<ul class="compare">
		{#each compareRows as row (row.label)}
			<li>
				<span class="name">{row.label}</span>
				{#if row.prior}
					<div class="span">
						<div class="reading">
							<span>{row.prior.when}</span>
							<strong class="num">{row.prior.value} {lu}</strong>
						</div>
						{#if row.prior.change === 'up'}
							<span class="delta" aria-label="up {row.prior.amount} {lu}">
								<Icon name="up" size={16} />{row.prior.amount} {lu}
							</span>
						{:else if row.prior.change === 'down'}
							<span class="delta" aria-label="down {row.prior.amount} {lu}">
								<Icon name="down" size={16} />{row.prior.amount} {lu}
							</span>
						{:else}
							<span class="delta same" aria-label="unchanged">-</span>
						{/if}
						<div class="reading now">
							<span>{row.currentWhen}</span>
							<strong class="num">{row.current} {lu}</strong>
						</div>
					</div>
				{:else}
					<div class="reading">
						<span>{row.currentWhen}</span>
						<strong class="num">{row.current} {lu}</strong>
					</div>
				{/if}
			</li>
		{/each}
	</ul>
	{#snippet footer()}
		<button type="button" class="btn primary block" onclick={() => (compareOpen = false)}>Done</button>
	{/snippet}
</Sheet>

<style>
	.actions {
		display: flex;
		flex-wrap: wrap;
		max-width: 100%;
		gap: 0.5rem;
	}
	.summary {
		display: grid;
		grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr);
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	.summary > button {
		display: grid;
		align-content: space-between;
		gap: 0.3rem;
		min-width: 0;
		min-height: 130px;
		padding: 0.9rem;
		border: 1.5px solid var(--ink);
		border-radius: var(--radius);
		background: var(--surface);
		color: inherit;
		text-align: left;
		font: inherit;
		cursor: pointer;
	}
	.summary .bf {
		background: var(--chrome);
		color: var(--ink);
		border-color: var(--chrome);
	}
	.summary .bf .eyebrow,
	.summary .bf .chg {
		color: var(--steel);
	}
	.summary strong {
		font-size: clamp(1.8rem, 8vw, 2.8rem);
		font-weight: 850;
		font-stretch: 120%;
		line-height: 1;
	}
	.summary .bf strong {
		color: var(--lime);
	}
	.summary small {
		font-size: 1rem;
		margin-left: 2px;
	}
	.chg {
		font-size: 0.8rem;
	}
	.chart-card {
		padding: 0.75rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.picks {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin-bottom: 0.65rem;
	}
	.picks button {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.28rem 0.6rem;
		border: 1px solid var(--line);
		border-radius: 999px;
		background: transparent;
		color: var(--steel);
		font: inherit;
		font-size: 0.78rem;
		font-weight: 700;
		cursor: pointer;
	}
	.picks button[aria-pressed='true'] {
		color: var(--ink);
		border-color: var(--line-strong);
		background: var(--paper-2);
	}
	.picks i {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		opacity: 0.35;
	}
	.picks button[aria-pressed='true'] i {
		opacity: 1;
	}
	.entries {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.6rem;
	}
	.entry {
		display: block;
		width: 100%;
		padding: 0.8rem 0.9rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
		text-align: left;
		font: inherit;
		cursor: pointer;
	}
	.entry:hover {
		border-color: var(--ink);
	}
	.entry-head {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.4rem;
	}
	.pill {
		padding: 0.1rem 0.55rem;
		border-radius: 999px;
		background: var(--lime);
		color: var(--on-lime);
		font-weight: 800;
		font-size: 0.85rem;
	}
	.tag {
		padding: 0.1rem 0.55rem;
		border-radius: 999px;
		background: var(--paper-2);
		font-size: 0.75rem;
		font-weight: 750;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--steel);
	}
	dl {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
		gap: 0.25rem 1rem;
		margin: 0;
	}
	dl div {
		display: flex;
		justify-content: space-between;
		gap: 0.5rem;
		font-size: 0.88rem;
	}
	dt {
		color: var(--steel);
	}
	dd {
		margin: 0;
		font-weight: 700;
	}
	em {
		font-style: normal;
		font-size: 0.75rem;
		font-weight: 650;
		color: var(--steel);
	}
	.note {
		margin-top: 0.4rem;
		font-size: 0.85rem;
	}
	.bf-preview {
		display: grid;
		gap: 0.1rem;
		padding: 0.75rem 0.9rem;
		border-radius: var(--radius);
		background: var(--paper-2);
		transition: background-color 0.3s;
	}
	.bf-preview.ready {
		background: var(--lime);
		color: var(--on-lime);
	}
	.bf-preview.ready .eyebrow,
	.bf-preview.ready .muted {
		color: color-mix(in srgb, var(--on-lime) 70%, transparent);
	}
	.bf-preview.ready a {
		color: var(--on-lime);
	}
	.bf-preview strong {
		font-size: 2rem;
		font-weight: 850;
		font-stretch: 120%;
	}
	.bf-preview .muted {
		font-size: 0.78rem;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.6rem;
	}
	.grid .field:first-child {
		grid-column: span 3;
	}
	.bf-field :global(input) {
		border-color: var(--lime-deep) !important;
		background: color-mix(in srgb, var(--lime) 12%, var(--paper-2)) !important;
	}
	.del {
		margin-top: 0.75rem;
	}
	.compare-empty {
		margin: 0 0 0.85rem;
		color: var(--steel);
		font-size: 0.85rem;
	}
	.compare {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.85rem;
	}
	.compare > li {
		display: grid;
		gap: 0.35rem;
		padding-bottom: 0.85rem;
		border-bottom: 1px solid var(--line);
	}
	.compare > li:last-child {
		border-bottom: 0;
		padding-bottom: 0;
	}
	.name {
		font-weight: 750;
	}
	.span {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 0.65rem;
	}
	.reading {
		display: grid;
		gap: 0.1rem;
	}
	.reading span {
		color: var(--steel);
		font-size: 0.75rem;
	}
	.reading strong {
		font-size: 1.05rem;
	}
	.now {
		text-align: right;
	}
	.delta {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: 0.1rem;
		font-weight: 750;
		font-variant-numeric: tabular-nums;
	}
	.delta.same {
		color: var(--steel);
		font-weight: 650;
	}
	@media (max-width: 480px) {
		.summary {
			grid-template-columns: 1fr 1fr;
		}
		.summary .bf {
			grid-column: 1 / -1;
		}
		.actions {
			flex-direction: column;
			width: 100%;
		}
		.grid {
			grid-template-columns: repeat(2, 1fr);
		}
		.grid .field:first-child {
			grid-column: span 2;
		}
	}
</style>
