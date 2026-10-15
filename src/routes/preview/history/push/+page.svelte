<script lang="ts">
	import PreviewNote from '$lib/preview/PreviewNote.svelte';
	import HitBadge from '$lib/components/HitBadge.svelte';
	import { hitMethod } from '$lib/hit';
	import { workoutHistory } from '$lib/preview/data';

	const workout = workoutHistory[0];
</script>

<svelte:head><title>Push Strength preview · Strongr</title></svelte:head>

<div class="page">
	<a class="back" href="/preview/history">← History</a>
	<div class="page-head">
		<div>
			<p class="eyebrow">{new Date(workout.startedAt).toLocaleDateString(undefined, { dateStyle: 'long' })}</p>
			<h1>{workout.name}</h1>
		</div>
	</div>
	<PreviewNote>This completed session shows the exact working weights and reps, plus its duration and total volume.</PreviewNote>

	<div class="summary">
		<div><span class="eyebrow">Time</span><strong class="num">{Math.round(workout.durationSec / 60)} min</strong></div>
		<div><span class="eyebrow">Volume</span><strong class="num">{workout.volumeKg.toLocaleString()} kg</strong></div>
		<div><span class="eyebrow">Sets</span><strong class="num">{workout.exercises.reduce((n, e) => n + e.sets.length, 0)}</strong></div>
	</div>

	<div class="stack section">
		{#each workout.exercises as exercise (exercise.id)}
			<section class="exercise">
				<h2>{exercise.name}</h2>
				<div class="set-head"><span>Set</span><span>Weight</span><span>Reps</span></div>
				{#each exercise.sets as set, index (set.id)}
					<div class="set-row num"><span>{index + 1}</span><strong>{set.weight} kg</strong><strong>{set.reps}</strong></div>
				{/each}
				{#each exercise.hits as hit (hit.id)}
					{@const method = hitMethod(hit.methodKey)}
					<div class="hit" style:--hit-color={method.color}>
						<HitBadge method={hit.methodKey} full />
						{#each hit.logs as log, index (log.id)}
							<p class="num">{method.entryLabel} {index + 1}: {log.weight} kg × {log.reps}</p>
						{/each}
					</div>
				{/each}
			</section>
		{/each}
	</div>
</div>

<style>
	.back {
		display: inline-block;
		margin-bottom: 1rem;
		color: var(--link);
		text-decoration: none;
	}
	.summary {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.65rem;
	}
	.summary div {
		display: grid;
		gap: 0.25rem;
		padding: 0.8rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.exercise {
		padding: 1rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.set-head,
	.set-row {
		display: grid;
		grid-template-columns: 1fr 2fr 1fr;
		gap: 0.5rem;
		padding: 0.55rem 0;
		border-bottom: 1px solid var(--line);
	}
	.set-head {
		color: var(--steel);
		font-size: 0.75rem;
		text-transform: uppercase;
	}
	.set-row:last-child {
		border-bottom: 0;
	}
	.hit {
		margin-top: 0.7rem;
		padding: 0.55rem;
		border-left: 3px solid var(--hit-color);
		background: color-mix(in srgb, var(--hit-color) 6%, var(--paper-2));
	}
	.hit p {
		margin: 0.35rem 0 0;
		font-size: 0.85rem;
	}
</style>
