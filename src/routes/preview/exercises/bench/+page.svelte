<script lang="ts">
	import PreviewNote from '$lib/preview/PreviewNote.svelte';
	import { exercises, workoutHistory } from '$lib/preview/data';

	const exercise = exercises[0];
	const sessions = workoutHistory
		.map((workout) => ({
			workout,
			sets: workout.exercises.find((item) => item.id === exercise.id)?.sets ?? []
		}))
		.filter((item) => item.sets.length);
</script>

<svelte:head><title>Bench Press preview · Strongr</title></svelte:head>

<div class="page">
	<a class="back" href="/preview/exercises">← Exercises</a>
	<div class="page-head">
		<div>
			<p class="eyebrow">{exercise.muscleGroup}</p>
			<h1>{exercise.name}</h1>
		</div>
	</div>
	<PreviewNote>Each movement keeps setup notes and its own performance history, so progression is easy to review.</PreviewNote>

	<section class="card">
		<p class="eyebrow">Setup note</p>
		<p>{exercise.note}</p>
	</section>

	<section class="section">
		<h2>Recent performance</h2>
		{#each sessions as session (session.workout.id)}
			<article class="session">
				<div><strong>{new Date(session.workout.startedAt).toLocaleDateString()}</strong><span class="muted">{session.workout.name}</span></div>
				<p class="num">{session.sets.map((set) => `${set.weight} kg × ${set.reps}`).join(' · ')}</p>
			</article>
		{/each}
	</section>
</div>

<style>
	.back {
		display: inline-block;
		margin-bottom: 1rem;
		color: var(--link);
		text-decoration: none;
	}
	.card,
	.session {
		padding: 1rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.card p {
		margin: 0;
	}
	.session {
		display: grid;
		gap: 0.6rem;
		margin-top: 0.65rem;
	}
	.session div {
		display: flex;
		justify-content: space-between;
	}
	.session p {
		margin: 0;
	}
</style>
