<script lang="ts">
	import PreviewNote from '$lib/preview/PreviewNote.svelte';
	import { exercises } from '$lib/preview/data';

	let query = $state('');
	let group = $state('');
	const groups = [...new Set(exercises.map((exercise) => exercise.muscleGroup))].sort();
	const filtered = $derived(
		exercises.filter(
			(exercise) =>
				(!group || exercise.muscleGroup === group) &&
				(!query || exercise.name.toLowerCase().includes(query.toLowerCase()))
		)
	);
</script>

<svelte:head><title>Exercises preview · Strongr</title></svelte:head>

<div class="page">
	<div class="page-head">
		<div>
			<p class="eyebrow">{exercises.length} sample movements</p>
			<h1>Exercises</h1>
		</div>
	</div>
	<PreviewNote>Search the exercise library or filter it by muscle. Open Bench Press for notes and recent performance.</PreviewNote>

	<div class="tools">
		<input class="input" type="search" placeholder="Search exercises" bind:value={query} />
		<select class="input" bind:value={group} aria-label="Muscle group">
			<option value="">All muscles</option>
			{#each groups as option (option)}<option value={option}>{option}</option>{/each}
		</select>
	</div>

	<div class="library">
		{#each filtered as exercise (exercise.id)}
			<a class="exercise" href={exercise.id === 'bench' ? '/preview/exercises/bench' : '/preview/exercises'}>
				<div><h2>{exercise.name}</h2><p class="muted">{exercise.muscleGroup}</p></div>
				<span>→</span>
			</a>
		{/each}
	</div>
</div>

<style>
	.tools {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 0.6rem;
		margin-bottom: 1rem;
	}
	.library {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.65rem;
	}
	.exercise {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 1rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--ink);
		text-decoration: none;
	}
	.exercise h2,
	.exercise p {
		margin: 0;
	}
	.exercise h2 {
		font-size: 1rem;
	}
	@media (max-width: 600px) {
		.library {
			grid-template-columns: 1fr;
		}
	}
</style>
