<script lang="ts">
	import { hitMethod, type HitField } from '$lib/hit';
	import { selectAll } from '$lib/select-all';
	import type { HitLogView, HitView } from '$lib/types';
	import { displayToKg, kgToDisplay, type WeightUnit } from '$lib/units';
	import HitBadge from './HitBadge.svelte';

	let {
		hit,
		unit,
		exercises,
		onchange
	}: {
		hit: HitView;
		unit: WeightUnit;
		exercises: { id: string; name: string }[];
		onchange: (log: HitLogView, field: HitField, value: number | string | null) => void;
	} = $props();

	const method = $derived(hitMethod(hit.methodKey));
	const labels = $derived<Record<HitField, string>>({
		weight: unit,
		reps: 'reps',
		duration: hit.methodKey === 'negatives' ? 'sec/rep' : 'sec',
		rest: 'rest s',
		exercise: 'exercise'
	});

	function intOrNull(value: string) {
		if (!value.trim()) return null;
		const number = Math.round(Number(value));
		return Number.isFinite(number) && number >= 0 ? number : null;
	}

	function update(log: HitLogView, field: HitField, value: number | string | null) {
		if (field === 'weight') log.weightKg = value as number | null;
		else if (field === 'reps') log.reps = value as number | null;
		else if (field === 'duration') log.durationSec = value as number | null;
		else if (field === 'rest') log.restSec = value as number | null;
		else {
			const exercise = exercises.find((item) => item.id === value);
			log.data = exercise ? { exerciseId: exercise.id, exerciseName: exercise.name } : {};
		}
		onchange(log, field, value);
	}
</script>

<section class="hit" style:--c={method.color}>
	<HitBadge method={hit.methodKey} full />
	<div class="rows">
		{#each hit.logs as log, index (log.id)}
			<div class="entry">
				<span class="entry-label">{method.entryLabel} {index + 1}</span>
				<div class="fields" style:--n={method.fields.length}>
					{#each method.fields as field (field)}
						<label class:wide={field === 'exercise'}>
							{#if field === 'weight'}
								<input
									inputmode="decimal"
									aria-label="Weight in {unit}"
									value={kgToDisplay(log.weightKg, unit)}
									onfocus={selectAll}
									onpointerup={selectAll}
									onchange={(event) =>
										update(log, field, displayToKg(event.currentTarget.value, unit))}
								/>
							{:else if field === 'reps'}
								<input
									inputmode="numeric"
									aria-label="Reps"
									value={log.reps ?? ''}
									onfocus={selectAll}
									onpointerup={selectAll}
									onchange={(event) => update(log, field, intOrNull(event.currentTarget.value))}
								/>
							{:else if field === 'duration'}
								<input
									inputmode="numeric"
									aria-label="Duration in seconds"
									value={log.durationSec ?? ''}
									onfocus={selectAll}
									onpointerup={selectAll}
									onchange={(event) => update(log, field, intOrNull(event.currentTarget.value))}
								/>
							{:else if field === 'rest'}
								<input
									inputmode="numeric"
									aria-label="Rest in seconds"
									value={log.restSec ?? ''}
									onfocus={selectAll}
									onpointerup={selectAll}
									onchange={(event) => update(log, field, intOrNull(event.currentTarget.value))}
								/>
							{:else}
								<select
									aria-label="Exercise"
									value={log.data?.exerciseId ?? ''}
									onchange={(event) => update(log, field, event.currentTarget.value || null)}
								>
									<option value="">Exercise…</option>
									{#each exercises as exercise (exercise.id)}
										<option value={exercise.id}>{exercise.name}</option>
									{/each}
								</select>
							{/if}
							<span>{labels[field]}</span>
						</label>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</section>

<style>
	.hit {
		margin-top: 0.4rem;
		padding: 0.3rem 0.45rem;
		border-left: 3px solid color-mix(in srgb, var(--c) 50%, var(--line-strong));
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		background: color-mix(in srgb, var(--c) 5%, transparent);
	}
	.rows {
		display: grid;
		gap: 0.2rem;
		margin-top: 0.25rem;
	}
	.entry {
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr);
		align-items: center;
		gap: 0.35rem;
		min-width: 0;
	}
	.entry-label {
		font-size: 0.75rem;
		font-weight: 800;
		color: color-mix(in srgb, var(--c) 65%, var(--ink-2));
	}
	.fields {
		display: grid;
		grid-template-columns: repeat(var(--n), minmax(0, 1fr));
		gap: 0.25rem;
		min-width: 0;
	}
	label {
		position: relative;
		display: block;
		min-width: 0;
	}
	input,
	select {
		width: 100%;
		min-width: 0;
		min-height: 32px;
		padding: 0.05rem 0.15rem 0.65rem;
		border: 1.5px solid transparent;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--ink);
		font: inherit;
		font-size: 0.88rem;
		font-weight: 700;
		text-align: center;
	}
	select {
		font-size: 0.78rem;
		text-align: left;
	}
	input:focus,
	select:focus {
		outline: none;
		border-color: var(--lime);
	}
	label > span {
		position: absolute;
		right: 0;
		bottom: 2px;
		left: 0;
		color: var(--steel);
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		text-align: center;
		pointer-events: none;
	}
	@media (max-width: 420px) {
		.entry {
			grid-template-columns: 1fr;
			gap: 0.05rem;
		}
	}
</style>
