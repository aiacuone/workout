<script lang="ts">
	import type { PreviewWorkout } from './data';

	let { workout }: { workout: PreviewWorkout } = $props();
	const sets = $derived(workout.exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0));
	const href = $derived(workout.id === 'push' ? '/preview/history/push' : '/preview/history');
</script>

<a class="workout-card" {href}>
	<div>
		<h3>{workout.name}</h3>
		<p class="muted">
			{new Date(workout.startedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
			· {Math.round(workout.durationSec / 60)} min
		</p>
	</div>
	<div class="summary num">
		<strong>{sets} sets</strong>
		<span>{workout.volumeKg.toLocaleString()} kg</span>
	</div>
</a>

<style>
	.workout-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
		color: var(--ink);
		text-decoration: none;
	}
	h3,
	p {
		margin: 0;
	}
	.summary {
		display: grid;
		text-align: right;
		white-space: nowrap;
	}
	.summary span {
		color: var(--steel);
		font-size: 0.82rem;
	}
</style>
