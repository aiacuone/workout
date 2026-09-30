<script lang="ts">
	import type { ChartConfiguration } from 'chart.js';
	import { enhance } from '$app/forms';
	import Chart from '$lib/components/Chart.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Sheet from '$lib/components/Sheet.svelte';
	import { navyBodyFat } from '$lib/bodyfat';
	import { MEASUREMENT_FIELDS, type MeasurementKey } from '$lib/measurements';
	import { cmToDisplay, displayToCm, kgToDisplay } from '$lib/units';

	let { data, form } = $props();

	type Entry = (typeof data.entries)[number];

	const wu = $derived(data.prefs?.weightUnit ?? 'kg');
	const lu = $derived(data.prefs?.lengthUnit ?? 'cm');
	const sex = $derived(data.prefs?.sex ?? 'male');

	let weightOpen = $state(false);
	let measureOpen = $state(false);
	let editing = $state<Entry | null>(null);
	let vals = $state<Record<string, string>>({});
	let placeholders = $state<Entry | null>(null);

	const newest = $derived([...data.entries].reverse());
	const latestWeight = $derived(newest.find((e) => e.weightKg != null) ?? null);
	const latestBf = $derived(newest.find((e) => e.bodyFatPct != null) ?? null);
	const firstBf = $derived(data.entries.find((e) => e.bodyFatPct != null) ?? null);
	const latestMeasure = $derived(
		newest.find((e) => MEASUREMENT_FIELDS.some((f) => e[f.key] != null) || e.bodyFatPct != null) ?? null
	);

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

	function isWeightOnly(e: Entry) {
		return e.weightKg != null && !MEASUREMENT_FIELDS.some((f) => e[f.key] != null) && e.bodyFatPct == null;
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
		if (isWeightOnly(e)) openWeight(e);
		else openMeasure(e);
	}

	function delta(key: MeasurementKey | 'weightKg' | 'bodyFatPct', e: Entry) {
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

	const chartEntries = $derived(data.entries.filter((e) => e.weightKg != null || e.bodyFatPct != null));

	const config = $derived.by(
		(): ChartConfiguration => ({
			type: 'line',
			data: {
				labels: chartEntries.map((e) =>
					new Date(e.measuredOn + 'T00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
				),
				datasets: [
					{
						label: `Weight (${wu})`,
						data: chartEntries.map((e) => (e.weightKg == null ? null : Number(kgToDisplay(e.weightKg, wu)))),
						yAxisID: 'w',
						borderColor: '#e8eee9',
						backgroundColor: '#e8eee9',
						borderWidth: 2.5,
						tension: 0.3,
						spanGaps: true,
						pointRadius: 3
					},
					{
						label: 'Body fat %',
						data: chartEntries.map((e) => e.bodyFatPct),
						yAxisID: 'bf',
						borderColor: '#2f7bff',
						backgroundColor: 'rgba(47, 123, 255, 0.18)',
						fill: true,
						borderWidth: 2.5,
						tension: 0.3,
						spanGaps: true,
						pointRadius: 3
					}
				]
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				interaction: { mode: 'index', intersect: false },
				plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, boxHeight: 3 } } },
				scales: {
					x: { grid: { display: false }, ticks: { maxRotation: 0, autoSkipPadding: 12 } },
					w: { position: 'left', grid: { color: '#243040' } },
					bf: { position: 'right', grid: { display: false }, ticks: { callback: (v) => `${v}%` } }
				}
			}
		})
	);

	const closeSheet = () => {
		editing = null;
	};
</script>

<svelte:head><title>Measurements · Ironlog</title></svelte:head>

<div class="page">
	<div class="page-head">
		<div>
			<p class="eyebrow">Body</p>
			<h1>Measurements</h1>
		</div>
		<div class="actions">
			<button class="btn" onclick={() => openWeight()}><Icon name="plus" size={18} />Weight</button>
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
	</section>

	{#if chartEntries.length > 1}
		<div class="chart-card"><Chart {config} height={230} /></div>
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
			<p class="empty">No entries yet. Log weight and measurements separately whenever you take them.</p>
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
				if (result.type === 'success') weightOpen = false;
			}}
	>
		{#if form?.error && form?.kind === 'weight'}<p class="form-error">{form.error}</p>{/if}
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
	bind:open={measureOpen}
	title={editing ? 'Edit measurements' : 'Log measurements'}
	onclose={closeSheet}
>
	<form
		method="POST"
		action="?/saveMeasurements"
		class="stack"
		use:enhance={() =>
			async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success') measureOpen = false;
			}}
	>
		{#if form?.error && form?.kind === 'measure'}<p class="form-error">{form.error}</p>{/if}
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
					{f.label} ({lu})
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

<style>
	.actions {
		display: flex;
		gap: 0.5rem;
	}
	.summary {
		display: grid;
		grid-template-columns: 1.4fr 1fr;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}
	.summary > button {
		display: grid;
		align-content: space-between;
		gap: 0.3rem;
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
		font-size: 2.8rem;
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
	@media (max-width: 480px) {
		.actions {
			flex-direction: column;
		}
		.grid {
			grid-template-columns: repeat(2, 1fr);
		}
		.grid .field:first-child {
			grid-column: span 2;
		}
	}
</style>
