<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import RoutineCard from '$lib/components/RoutineCard.svelte';
	import Sheet from '$lib/components/Sheet.svelte';

	let { data, form } = $props();
	let creating = $state(false);
</script>

<svelte:head><title>Routines · Ironlog</title></svelte:head>

<div class="page">
	<div class="page-head">
		<div>
			<p class="eyebrow">Start or edit</p>
			<h1>Routines</h1>
		</div>
		<button class="btn primary" onclick={() => (creating = true)}><Icon name="plus" size={18} />New</button>
	</div>

	{#if data.active}
		<p class="muted start-note">Finish your current workout before starting another.</p>
	{:else}
		<form method="POST" action="/workout/start" class="start">
			<button class="btn primary block big"><Icon name="bolt" size={20} />Start an empty workout</button>
		</form>
	{/if}

	{#if data.routines.length}
		<div class="stack">
			{#each data.routines as r (r.id)}
				<RoutineCard routine={r} canStart={!data.active} canDelete />
			{/each}
		</div>
	{:else}
		<p class="empty">No routines yet. Build one to start workouts with a single tap.</p>
	{/if}
</div>

<Sheet bind:open={creating} title="New routine">
	<form method="POST" action="?/create" use:enhance class="stack">
		{#if form?.error}<p class="form-error">{form.error}</p>{/if}
		<label class="field">
			Name
			<input name="name" required maxlength="80" placeholder="e.g. Push A" />
		</label>
		<button class="btn primary block">Create routine</button>
	</form>
</Sheet>

<style>
	.start {
		margin-bottom: 1.25rem;
	}
	.start-note {
		margin: 0 0 1.25rem;
	}
	.big {
		min-height: 60px;
		font-size: 1.1rem;
	}
</style>
