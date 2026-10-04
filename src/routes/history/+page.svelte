<script lang="ts">
	import WorkoutCard from '$lib/components/WorkoutCard.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import { copyText } from '$lib/clipboard';
	import { workoutsTsv, type HistoryExportWorkout } from '$lib/export-text';
	import { toast } from '$lib/toast.svelte';

	let { data } = $props();
	const unit = $derived(data.prefs?.weightUnit ?? 'kg');
	let copying = $state(false);

	async function copyHistory() {
		if (!data.workouts.length || copying) return;
		copying = true;
		try {
			const res = await fetch('/api/history/export');
			if (!res.ok) throw new Error('Export failed');
			const body = (await res.json()) as { workouts: HistoryExportWorkout[] };
			await copyText(workoutsTsv(body.workouts, unit));
			toast('Workout history copied.');
		} catch {
			toast('Couldn’t copy workout history.', 'error');
		} finally {
			copying = false;
		}
	}

	const months = $derived.by(() => {
		const groups: { key: string; label: string; items: typeof data.workouts }[] = [];
		for (const w of data.workouts) {
			const d = new Date(w.startedAt);
			const key = `${d.getFullYear()}-${d.getMonth()}`;
			let g = groups.at(-1);
			if (!g || g.key !== key) {
				g = { key, label: d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }), items: [] };
				groups.push(g);
			}
			g.items.push(w);
		}
		return groups;
	});
</script>

<svelte:head><title>History · Strongr</title></svelte:head>

<div class="page">
	<div class="page-head">
		<div>
			<p class="eyebrow">{data.workouts.length} workouts logged</p>
			<h1>History</h1>
		</div>
		{#if data.workouts.length}
			<button class="btn" type="button" disabled={copying} onclick={copyHistory}>
				<Icon name="copy" size={18} />{copying ? 'Copying…' : 'Copy'}
			</button>
		{/if}
	</div>

	{#each months as m (m.key)}
		<section class="month">
			<h2 class="eyebrow">{m.label} · {m.items.length}</h2>
			<div class="stack">
				{#each m.items as w (w.id)}<WorkoutCard workout={w} {unit} />{/each}
			</div>
		</section>
	{:else}
		<p class="empty">No finished workouts yet. <a href="/routines">Start one</a>.</p>
	{/each}
</div>

<style>
	.month {
		margin-bottom: 1.75rem;
	}
	.month h2 {
		margin-bottom: 0.6rem;
		font-size: 0.75rem;
	}
</style>
