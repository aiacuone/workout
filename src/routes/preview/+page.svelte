<script lang="ts">
	import { goto } from '$app/navigation';
	import PreviewNote from '$lib/preview/PreviewNote.svelte';
	import PreviewWorkoutCard from '$lib/preview/PreviewWorkoutCard.svelte';
	import { routines, weeks } from '$lib/preview/data';
	import { previewSession, startPreviewWorkout } from '$lib/preview/session.svelte';

	const maxWeek = Math.max(...weeks);

	function start(id: string) {
		startPreviewWorkout(id);
		goto('/preview/workout');
	}
</script>

<svelte:head><title>Preview · Strongr</title></svelte:head>

<div class="page">
	<section class="hero">
		<p class="eyebrow">Welcome to the sample account</p>
		<h1>Train with a clear record.</h1>
		<p class="muted">Strongr keeps routines, working sets, progress and body measurements together.</p>
	</section>

	<PreviewNote>Start with the week chart and body-fat snapshot, then launch a sample routine below.</PreviewNote>

	<section class="tiles">
		<div class="tile">
			<span class="eyebrow">Last 8 weeks</span>
			<div class="bars" aria-label="Workouts per week">
				{#each weeks as count, index (index)}
					<span style:height="{(count / maxWeek) * 100}%" class:now={index === weeks.length - 1}></span>
				{/each}
			</div>
			<strong class="num">23<small> workouts</small></strong>
		</div>
		<a class="tile" href="/preview/measurements">
			<span class="eyebrow">Body fat</span>
			<strong class="big num">15.8<small>%</small></strong>
			<span class="muted small">{previewSession.measurements.at(-1)?.weight ?? 82.2} kg · latest</span>
		</a>
	</section>

	<section class="section">
		<div class="row between">
			<h2>Quick start</h2>
			<a class="btn sm ghost" href="/preview/routines">All routines</a>
		</div>
		<div class="stack">
			{#each routines as routine (routine.id)}
				<article class="routine">
					<a href={routine.id === 'push' ? '/preview/routines/push' : '/preview/routines'}>
						<h3>{routine.name}</h3>
						<p class="muted">{routine.exercises.map((item) => `${item.sets}× ${item.name}`).join(', ')}</p>
					</a>
					<button class="btn primary sm" type="button" onclick={() => start(routine.id)}>Start</button>
				</article>
			{/each}
		</div>
	</section>

	<section class="section">
		<div class="row between">
			<h2>Recent</h2>
			<a class="btn sm ghost" href="/preview/history">All history</a>
		</div>
		<div class="stack">
			{#each previewSession.history.slice(0, 2) as workout (workout.id)}
				<PreviewWorkoutCard {workout} />
			{/each}
		</div>
	</section>
</div>

<style>
	.hero {
		display: grid;
		gap: 0.65rem;
	}
	.hero h1 {
		max-width: 14ch;
		font-size: clamp(2rem, 8vw, 3rem);
	}
	.tiles {
		display: grid;
		grid-template-columns: 1.3fr 1fr;
		gap: 0.75rem;
	}
	.tile {
		display: grid;
		align-content: space-between;
		gap: 0.4rem;
		min-height: 140px;
		padding: 0.85rem;
		border: 1.5px solid var(--line-strong);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--ink);
		text-decoration: none;
	}
	.big {
		color: var(--lime);
		font-size: clamp(1.7rem, 9vw, 2.6rem);
	}
	.tile small {
		color: var(--steel);
		font-size: 0.8rem;
	}
	.bars {
		display: flex;
		align-items: end;
		gap: 4px;
		height: 48px;
	}
	.bars span {
		flex: 1;
		min-height: 3px;
		background: var(--line-strong);
	}
	.bars .now {
		background: var(--lime);
	}
	.between {
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}
	.routine {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.routine a {
		flex: 1;
		min-width: 0;
		color: var(--ink);
		text-decoration: none;
	}
	.routine h3,
	.routine p {
		margin: 0;
	}
</style>
