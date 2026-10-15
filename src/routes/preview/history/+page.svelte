<script lang="ts">
	import PreviewNote from '$lib/preview/PreviewNote.svelte';
	import PreviewWorkoutCard from '$lib/preview/PreviewWorkoutCard.svelte';
	import { previewSession } from '$lib/preview/session.svelte';
</script>

<svelte:head><title>History preview · Strongr</title></svelte:head>

<div class="page">
	<div class="page-head">
		<div>
			<p class="eyebrow">{previewSession.history.length} workouts logged</p>
			<h1>History</h1>
		</div>
	</div>
	<PreviewNote>Finished workouts are grouped here. Open Push Strength to see its exercises and every logged set.</PreviewNote>

	<section class="section">
		<h2>October 2026</h2>
		<div class="stack">
			{#each previewSession.history as workout (workout.id)}
				<PreviewWorkoutCard {workout} />
			{/each}
		</div>
	</section>
</div>
