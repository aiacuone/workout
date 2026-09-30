<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import RoutineCard from '$lib/components/RoutineCard.svelte';

	let { data } = $props();
</script>

<svelte:head><title>Start workout · Ironlog</title></svelte:head>

<div class="page">
	<div class="page-head">
		<div>
			<p class="eyebrow">Ready when you are</p>
			<h1>Start workout</h1>
		</div>
	</div>

	<form method="POST" action="/workout/start">
		<button class="btn primary block big"><Icon name="bolt" size={20} />Start an empty workout</button>
	</form>

	<section class="section">
		<div class="row between">
			<h2>Routines</h2>
			<a class="btn sm ghost" href="/routines">Manage</a>
		</div>
		{#if data.routines.length}
			<div class="stack">
				{#each data.routines as r (r.id)}<RoutineCard routine={r} canDelete />{/each}
			</div>
		{:else}
			<p class="empty">No routines yet. <a href="/routines">Create one</a> to start with your exercises preloaded.</p>
		{/if}
	</section>
</div>

<style>
	.big {
		min-height: 60px;
		font-size: 1.1rem;
	}
	.between {
		justify-content: space-between;
		margin-bottom: 0.75rem;
	}
</style>
