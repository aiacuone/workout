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
			<p class="eyebrow">Templates</p>
			<h1>Routines</h1>
		</div>
		<button class="btn primary" onclick={() => (creating = true)}><Icon name="plus" size={18} />New</button>
	</div>

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
