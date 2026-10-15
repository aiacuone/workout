<script lang="ts">
	import { goto } from '$app/navigation';
	import HitBadge from '$lib/components/HitBadge.svelte';
	import PreviewNote from '$lib/preview/PreviewNote.svelte';
	import { routines } from '$lib/preview/data';
	import { startPreviewWorkout } from '$lib/preview/session.svelte';

	const routine = routines[0];
	function start() {
		startPreviewWorkout(routine.id);
		goto('/preview/workout');
	}
</script>

<svelte:head><title>Push Strength routine · Strongr</title></svelte:head>

<div class="page">
	<a class="back" href="/preview/routines">← Routines</a>
	<div class="page-head">
		<div>
			<p class="eyebrow">3 exercises · 9 working sets</p>
			<h1>{routine.name}</h1>
		</div>
	</div>
	<PreviewNote>A routine can include standard working sets and high-intensity techniques. Bench Press ends with a sample drop set.</PreviewNote>

	<div class="stack">
		{#each routine.exercises as exercise, index (exercise.id)}
			<article class="exercise">
				<span class="order num">{index + 1}</span>
				<div>
					<h2>{exercise.name}</h2>
					<p class="muted">{exercise.sets} sets · 8–12 reps</p>
					{#if 'hitMethod' in exercise}<HitBadge method={exercise.hitMethod} full />{/if}
				</div>
			</article>
		{/each}
	</div>
	<button class="btn primary block start" type="button" onclick={start}>Start this sample workout</button>
</div>

<style>
	.back {
		display: inline-block;
		margin-bottom: 1rem;
		color: var(--link);
		text-decoration: none;
	}
	.exercise {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.exercise h2,
	.exercise p {
		margin: 0;
	}
	.order {
		display: grid;
		place-items: center;
		width: 2rem;
		height: 2rem;
		border-radius: 50%;
		background: var(--chrome);
		color: var(--lime);
	}
	.start {
		margin-top: 1rem;
	}
</style>
