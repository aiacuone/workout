<script lang="ts">
	import Elapsed from '$lib/components/Elapsed.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import RoutineCard from '$lib/components/RoutineCard.svelte';
	import WorkoutCard from '$lib/components/WorkoutCard.svelte';
	import { kgToDisplay } from '$lib/units';

	let { data } = $props();
	const unit = $derived(data.prefs?.weightUnit ?? 'kg');
	const maxWeek = $derived(Math.max(1, ...data.stats.weeks));

	const greeting = $derived.by(() => {
		const h = new Date().getHours();
		return h < 12 ? 'Morning' : h < 18 ? 'Afternoon' : 'Evening';
	});
</script>

<svelte:head><title>Ironlog</title></svelte:head>

<div class="page">
	<section class="hero">
		<p class="eyebrow">{greeting}, {data.user?.username}</p>
		<h1>{data.active ? 'Workout in progress.' : data.stats.thisWeek ? `${data.stats.thisWeek} this week. Keep it moving.` : 'Time to train.'}</h1>

		{#if data.active}
			<a class="btn primary block cta" href="/workout/active">
				<Icon name="play" size={20} />Resume {data.active.name} · <Elapsed since={data.active.startedAt} />
			</a>
		{/if}
	</section>

	<section class="tiles">
		<div class="tile">
			<span class="eyebrow">Last 8 weeks</span>
			<div class="bars" aria-label="Workouts per week">
				{#each data.stats.weeks as n, i (i)}
					<span style:height="{(n / maxWeek) * 100}%" class:now={i === data.stats.weeks.length - 1} title="{n} workouts"></span>
				{/each}
			</div>
			<strong class="num">{data.stats.total}<small> workouts</small></strong>
		</div>
		<a class="tile" href="/measurements">
			<span class="eyebrow">Body fat</span>
			{#if data.latestBf?.bodyFatPct != null}
				<strong class="big num">{data.latestBf.bodyFatPct}<small>%</small></strong>
			{:else}
				<strong class="big">—</strong>
			{/if}
			<span class="muted small">
				{#if data.latestWeight?.weightKg != null}{kgToDisplay(data.latestWeight.weightKg, unit)} {unit} ·{/if}
				{data.latestBf
					? new Date(data.latestBf.measuredOn).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
					: data.latestWeight
						? new Date(data.latestWeight.measuredOn).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
						: 'Log measurements'}
			</span>
		</a>
	</section>

	{#if !data.active}
		<section class="section">
			<div class="row between">
				<h2>Quick start</h2>
				<a class="btn sm ghost" href="/routines">All routines</a>
			</div>
			{#if data.routines.length}
				<div class="stack">
					{#each data.routines as r (r.id)}<RoutineCard routine={r} />{/each}
				</div>
			{:else}
				<a class="empty-link" href="/routines">Create a routine to start workouts in one tap →</a>
			{/if}
		</section>
	{/if}

	<section class="section">
		<div class="row between">
			<h2>Recent</h2>
			<a class="btn sm ghost" href="/history">All history</a>
		</div>
		{#if data.recent.length}
			<div class="stack">
				{#each data.recent as w (w.id)}<WorkoutCard workout={w} {unit} />{/each}
			</div>
		{:else}
			<p class="empty">Your finished workouts will show up here.</p>
		{/if}
	</section>
</div>

<style>
	.hero {
		display: grid;
		gap: 0.75rem;
		padding: 0.5rem 0 1.25rem;
	}
	.hero h1 {
		font-size: clamp(2rem, 8vw, 3rem);
		max-width: 14ch;
	}
	.cta {
		min-height: 58px;
		font-size: 1.08rem;
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
		border: 1.5px solid var(--ink);
		border-radius: var(--radius);
		background: var(--surface);
		text-decoration: none;
	}
	a.tile {
		background: var(--chrome);
		color: var(--ink);
	}
	a.tile .eyebrow,
	a.tile .muted {
		color: var(--steel);
	}
	.tile strong {
		font-size: 1.4rem;
		font-weight: 850;
		font-stretch: 118%;
	}
	.tile .big {
		font-size: 2.6rem;
		line-height: 1;
		color: var(--lime);
	}
	.tile small {
		margin-left: 0.25rem;
		font-size: 0.8rem;
		font-weight: 650;
		color: var(--steel);
	}
	.small {
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
		border-radius: 2px;
		background: var(--line-strong);
		transition: height 0.6s var(--ease);
	}
	.bars span.now {
		background: var(--lime-deep);
	}
	.between {
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}
	.empty-link {
		display: block;
		padding: 1rem;
		border: 1.5px dashed var(--line-strong);
		border-radius: var(--radius);
		color: var(--ink-2);
		font-weight: 650;
		text-decoration: none;
	}
</style>
