<script lang="ts">
	import { ratingColor, setSummary } from '$lib/format';
	import type { Trend } from '$lib/records';
	import { formatDate, formatDuration, kgToDisplay, type WeightUnit } from '$lib/units';
	import HitBadge from './HitBadge.svelte';
	import TrendMarks from './Trend.svelte';

	type Summary = {
		id: string;
		name: string;
		startedAt: string;
		durationSec: number | null;
		volumeKg: number;
		exercises: {
			exerciseId: string;
			name: string;
			rating: number | null;
			sets: number;
			best: { weightKg: number | null; reps: number | null } | null;
			hits: string[];
			trend: Trend;
		}[];
	};

	let { workout, unit, href = `/history/${workout.id}` }: { workout: Summary; unit: WeightUnit; href?: string } = $props();
</script>

<a class="card" {href}>
	<header>
		<div>
			<h3>{workout.name}</h3>
			<p class="muted">{formatDate(workout.startedAt)} · {new Date(workout.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
		</div>
		<div class="stats num">
			{#if workout.durationSec}<span>{formatDuration(workout.durationSec)}</span>{/if}
			<span>{Number(kgToDisplay(workout.volumeKg, unit)).toLocaleString()} {unit}</span>
		</div>
	</header>
	<ul>
		{#each workout.exercises as e (e.exerciseId)}
			<li>
				<span class="name">
					<span class="ex"><span class="num sets">{e.sets}×</span> {e.name}</span>
					<TrendMarks volume={e.trend.volume} weight={e.trend.weight} reps={e.trend.reps} {unit} />
				</span>
				<span class="right">
					{#each e.hits as h (h)}<HitBadge method={h} />{/each}
					{#if e.best}
						<span class="best num" style:color={ratingColor(e.rating) || undefined}
							>{setSummary(e.best, unit)}</span
						>
					{/if}
				</span>
			</li>
		{/each}
	</ul>
</a>

<style>
	.card {
		display: block;
		min-width: 0;
		max-width: 100%;
		padding: 0.9rem 1rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
		text-decoration: none;
		transition: border-color 0.15s;
	}
	.card:hover {
		border-color: var(--ink);
	}
	header {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 0.5rem;
	}
	header > :first-child {
		min-width: 0;
	}
	header p {
		font-size: 0.82rem;
	}
	.stats {
		display: grid;
		justify-items: end;
		font-size: 0.82rem;
		font-weight: 700;
		color: var(--ink-2);
	}
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.2rem;
	}
	li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		min-width: 0;
		font-size: 0.88rem;
	}
	.name {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		min-width: 0;
	}
	.ex {
		min-width: 0;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.sets {
		color: var(--steel);
		font-weight: 700;
	}
	.right {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		flex: none;
	}
	.best {
		color: var(--ink-2);
		font-weight: 650;
	}
	@media (max-width: 420px) {
		.right :global(.badge) {
			display: none;
		}
	}
</style>
