<script lang="ts">
	import { enhance } from '$app/forms';
	import Icon from '$lib/components/Icon.svelte';
	import Sheet from '$lib/components/Sheet.svelte';
	import ExerciseForm from '$lib/components/ExerciseForm.svelte';
	import { toastFormError } from '$lib/toast.svelte';

	let { data } = $props();

	let q = $state('');
	let group = $state('');
	let creating = $state(false);

	const filtered = $derived(
		data.exercises.filter(
			(e) =>
				(!group || e.muscleGroup === group) &&
				(!q || e.name.toLowerCase().includes(q.toLowerCase()))
		)
	);
	const groups = $derived([...new Set(data.exercises.map((e) => e.muscleGroup))].sort());
</script>

<svelte:head><title>Exercises · Strongr</title></svelte:head>

<div class="page">
	<div class="page-head">
		<div>
			<p class="eyebrow">{data.exercises.length} in library</p>
			<h1>Exercises</h1>
		</div>
		<button class="btn primary" onclick={() => (creating = true)}><Icon name="plus" size={18} />New</button>
	</div>

	<div class="tools">
		<input class="input" type="search" placeholder="Search" bind:value={q} />
		<select class="input" bind:value={group} aria-label="Muscle group">
			<option value="">All muscles</option>
			{#each groups as g (g)}<option>{g}</option>{/each}
		</select>
	</div>

	<ul class="list">
		{#each filtered as ex (ex.id)}
			<li>
				<a class="item" href="/exercises/{ex.id}">
					<span>
						<span class="name">{ex.name}</span>
						<span class="meta">{ex.muscleGroup} · {ex.equipment}</span>
					</span>
					{#if ex.uses}<span class="uses num">{ex.uses}×</span>{/if}
				</a>
			</li>
		{:else}
			<li class="empty">Nothing matches.</li>
		{/each}
	</ul>

	{#if data.archived.length}
		<details class="archived">
			<summary>Archived ({data.archived.length})</summary>
			<ul class="list">
				{#each data.archived as ex (ex.id)}
					<li><a class="item" href="/exercises/{ex.id}"><span class="name">{ex.name}</span></a></li>
				{/each}
			</ul>
		</details>
	{/if}
</div>

<Sheet bind:open={creating} title="New exercise">
	<form
		method="POST"
		action="?/create"
		use:enhance={() =>
			async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'failure') toastFormError(result.data);
				if (result.type === 'success') creating = false;
			}}
		class="stack"
	>
		<ExerciseForm muscleGroups={data.muscleGroups} equipment={data.equipment} />
		<button class="btn primary block">Create exercise</button>
	</form>
</Sheet>

<style>
	.tools {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}
	.item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.8rem 0.25rem;
		text-decoration: none;
	}
	.item > span:first-child {
		display: grid;
	}
	.name {
		font-weight: 700;
	}
	.meta {
		font-size: 0.82rem;
		color: var(--steel);
	}
	.archived {
		margin-top: 2rem;
	}
	.archived summary {
		margin-bottom: 0.5rem;
		font-weight: 700;
		color: var(--steel);
		cursor: pointer;
	}
	.uses {
		font-size: 0.8rem;
		font-weight: 700;
		color: var(--steel);
	}
</style>
