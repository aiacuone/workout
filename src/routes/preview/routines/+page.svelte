<script lang="ts">
	import { goto } from '$app/navigation';
	import PreviewNote from '$lib/preview/PreviewNote.svelte';
	import { routines } from '$lib/preview/data';
	import { startPreviewWorkout } from '$lib/preview/session.svelte';

	function start(id: string) {
		startPreviewWorkout(id);
		goto('/preview/workout');
	}
</script>

<svelte:head><title>Routines preview · Strongr</title></svelte:head>

<div class="page">
	<div class="page-head">
		<div>
			<p class="eyebrow">Ready-made training days</p>
			<h1>Routines</h1>
		</div>
	</div>
	<PreviewNote>Routines save the exercise order and number of sets. Start one to try logging a workout locally.</PreviewNote>

	<div class="stack">
		{#each routines as routine (routine.id)}
			<article class="routine">
				<div>
					<h2>{routine.name}</h2>
					<p class="muted">{routine.exercises.map((item) => `${item.sets}× ${item.name}`).join(', ')}</p>
				</div>
				<div class="actions">
					{#if routine.id === 'push'}<a class="btn" href="/preview/routines/push">View</a>{/if}
					<button class="btn primary" type="button" onclick={() => start(routine.id)}>Start</button>
				</div>
			</article>
		{/each}
	</div>
</div>

<style>
	.routine {
		display: grid;
		gap: 1rem;
		padding: 1rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.routine h2,
	.routine p {
		margin: 0;
	}
	.actions {
		display: flex;
		gap: 0.5rem;
	}
</style>
