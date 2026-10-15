<script lang="ts">
	import HitBadge from '$lib/components/HitBadge.svelte';
	import { hitMethod } from '$lib/hit';
	import { exercises, type PreviewHit } from './data';
	import { addPreviewHitLog, removePreviewHit } from './session.svelte';

	let { hit, exerciseId }: { hit: PreviewHit; exerciseId: string } = $props();
	const method = $derived(hitMethod(hit.methodKey));
</script>

<section class="hit" style:--hit-color={method.color}>
	<header>
		<HitBadge method={hit.methodKey} />
		<strong>{method.name}</strong>
		<button type="button" aria-label="Remove {method.name}" onclick={() => removePreviewHit(exerciseId, hit.id)}>×</button>
	</header>
	<p>{method.description}</p>

	<div class="entries">
		{#each hit.logs as log, index (log.id)}
			<div class="entry" class:done={log.completed}>
				<label class="complete"><input type="checkbox" bind:checked={log.completed} />{method.entryLabel} {index + 1}</label>
				<div class="fields">
					{#each method.fields as field (field)}
						<label>
							{#if field === 'weight'}
								<input class="input num" type="number" min="0" step="0.5" bind:value={log.weight} />
								<span>kg</span>
							{:else if field === 'reps'}
								<input class="input num" type="number" min="0" step="1" bind:value={log.reps} />
								<span>reps</span>
							{:else if field === 'duration'}
								<input class="input num" type="number" min="0" step="1" bind:value={log.duration} />
								<span>{hit.methodKey === 'negatives' ? 'sec/rep' : 'sec'}</span>
							{:else if field === 'rest'}
								<input class="input num" type="number" min="0" step="1" bind:value={log.rest} />
								<span>rest s</span>
							{:else}
								<select class="input" bind:value={log.exerciseId}>
									<option value="">Exercise…</option>
									{#each exercises as exercise (exercise.id)}
										<option value={exercise.id}>{exercise.name}</option>
									{/each}
								</select>
								<span>pre-exercise</span>
							{/if}
						</label>
					{/each}
				</div>
			</div>
		{/each}
	</div>
	<button class="add" type="button" onclick={() => addPreviewHitLog(exerciseId, hit.id)}>+ Add {method.entryLabel.toLowerCase()}</button>
</section>

<style>
	.hit {
		margin-top: 0.8rem;
		padding: 0.65rem;
		border-left: 3px solid var(--hit-color);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		background: color-mix(in srgb, var(--hit-color) 6%, var(--paper-2));
	}
	header {
		display: flex;
		align-items: center;
		gap: 0.45rem;
	}
	header strong {
		flex: 1;
	}
	header button,
	.add {
		border: 0;
		background: transparent;
		color: var(--ink-2);
		font: inherit;
		cursor: pointer;
	}
	header button {
		font-size: 1.25rem;
	}
	.hit > p {
		margin: 0.35rem 0 0.6rem;
		color: var(--ink-2);
		font-size: 0.8rem;
	}
	.entries {
		display: grid;
		gap: 0.45rem;
	}
	.entry {
		display: grid;
		gap: 0.4rem;
		padding: 0.45rem;
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--hit-color) 5%, var(--surface));
	}
	.entry.done {
		opacity: 0.65;
	}
	.complete {
		display: flex;
		align-items: center;
		gap: 0.4rem;
		font-size: 0.8rem;
		font-weight: 800;
	}
	.complete input {
		accent-color: var(--hit-color);
	}
	.fields {
		display: flex;
		gap: 0.35rem;
	}
	.fields label {
		position: relative;
		flex: 1;
		min-width: 0;
	}
	.fields .input {
		width: 100%;
		min-width: 0;
		padding-bottom: 1rem;
	}
	.fields label > span {
		position: absolute;
		right: 0.3rem;
		bottom: 0.1rem;
		left: 0.3rem;
		color: var(--steel);
		font-size: 0.65rem;
		text-align: center;
	}
	.add {
		margin-top: 0.5rem;
		color: color-mix(in srgb, var(--hit-color) 70%, var(--ink));
		font-size: 0.8rem;
		font-weight: 800;
	}
</style>
