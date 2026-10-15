<script lang="ts">
	import { goto } from '$app/navigation';
	import { HIT_METHODS } from '$lib/hit';
	import PreviewNote from '$lib/preview/PreviewNote.svelte';
	import PreviewHitBlock from '$lib/preview/PreviewHitBlock.svelte';
	import { addPreviewHit, finishPreviewWorkout, previewSession, startPreviewWorkout } from '$lib/preview/session.svelte';

	function start() {
		startPreviewWorkout('push');
	}

	function finish() {
		finishPreviewWorkout();
		goto('/preview/history');
	}
</script>

<svelte:head><title>Workout preview · Strongr</title></svelte:head>

<div class="page">
	{#if previewSession.active}
		<div class="page-head">
			<div>
				<p class="eyebrow">Workout in progress</p>
				<h1>{previewSession.active.name}</h1>
			</div>
		</div>
		<PreviewNote>Log working sets, then add a HIT technique such as a drop set, rest-pause cluster or isometric hold. Everything resets on refresh.</PreviewNote>

		<div class="stack">
			{#each previewSession.active.exercises as exercise (exercise.id)}
				<section class="exercise">
					<h2>{exercise.name}</h2>
					<div class="set-head"><span>Done</span><span>kg</span><span>Reps</span></div>
					{#each exercise.sets as set, index (set.id)}
						<div class="set-row" class:done={set.completed}>
							<label class="check">
								<input type="checkbox" bind:checked={set.completed} />
								<span>{index + 1}</span>
							</label>
							<input class="input num" aria-label="Set {index + 1} weight" type="number" min="0" step="0.5" bind:value={set.weight} />
							<input class="input num" aria-label="Set {index + 1} repetitions" type="number" min="0" step="1" bind:value={set.reps} />
						</div>
					{/each}
					<div class="hit-picker">
						<label for="hit-{exercise.id}">Add HIT technique</label>
						<select
							id="hit-{exercise.id}"
							class="input"
							value=""
							onchange={(event) => {
								if (event.currentTarget.value) addPreviewHit(exercise.id, event.currentTarget.value);
								event.currentTarget.value = '';
							}}
						>
							<option value="">Choose a method…</option>
							{#each HIT_METHODS as method (method.key)}
								<option value={method.key} disabled={exercise.hits.some((hit) => hit.methodKey === method.key)}>
									{method.name}
								</option>
							{/each}
						</select>
					</div>
					{#each exercise.hits as hit (hit.id)}
						<PreviewHitBlock {hit} exerciseId={exercise.id} />
					{/each}
				</section>
			{/each}
		</div>
		<button class="btn primary block finish" type="button" onclick={finish}>Finish sample workout</button>
	{:else}
		<div class="empty-state">
			<p class="eyebrow">Interactive sample</p>
			<h1>No workout in progress</h1>
			<PreviewNote>Start the sample routine to try entering weight, reps, and completed sets without saving anything.</PreviewNote>
			<button class="btn primary" type="button" onclick={start}>Start Push Strength</button>
		</div>
	{/if}
</div>

<style>
	.exercise {
		padding: 1rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.set-head,
	.set-row {
		display: grid;
		grid-template-columns: 0.8fr 1fr 1fr;
		gap: 0.6rem;
		align-items: center;
		margin-top: 0.55rem;
	}
	.set-head {
		color: var(--steel);
		font-size: 0.75rem;
		text-transform: uppercase;
	}
	.set-row.done {
		opacity: 0.65;
	}
	.check {
		display: flex;
		align-items: center;
		gap: 0.45rem;
		font-weight: 750;
	}
	.check input {
		width: 1.25rem;
		height: 1.25rem;
		accent-color: var(--lime);
	}
	.hit-picker {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		margin-top: 0.9rem;
		padding-top: 0.8rem;
		border-top: 1px solid var(--line);
	}
	.hit-picker label {
		font-size: 0.82rem;
		font-weight: 800;
		white-space: nowrap;
	}
	.hit-picker select {
		flex: 1;
		min-width: 0;
	}
	.finish {
		margin-top: 1rem;
		min-height: 52px;
	}
	.empty-state {
		padding-top: 10vh;
		text-align: center;
	}
	.empty-state h1 {
		margin-bottom: 1rem;
	}
</style>
