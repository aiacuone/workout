<script lang="ts">
	import Icon from './Icon.svelte';

	type Ex = { id: string; name: string; muscleGroup: string; equipment: string };

	let {
		exercises,
		onpick,
		exclude = []
	}: { exercises: Ex[]; onpick: (ex: Ex) => void; exclude?: string[] } = $props();

	let q = $state('');
	let group = $state('');

	const groups = $derived([...new Set(exercises.map((e) => e.muscleGroup))].sort());
	const filtered = $derived(
		exercises.filter(
			(e) =>
				(!group || e.muscleGroup === group) &&
				(!q ||
					e.name.toLowerCase().includes(q.toLowerCase()) ||
					e.equipment.toLowerCase().includes(q.toLowerCase()))
		)
	);
</script>

<div class="picker">
	<div class="search">
		<Icon name="search" size={18} />
		<input
			class="input"
			placeholder="Search exercises"
			data-autofocus
			bind:value={q}
		/>
	</div>
	<div class="chips" role="group" aria-label="Muscle group">
		<button type="button" class:on={!group} onclick={() => (group = '')}>All</button>
		{#each groups as g (g)}
			<button type="button" class:on={group === g} onclick={() => (group = group === g ? '' : g)}>
				{g}
			</button>
		{/each}
	</div>
	<ul class="list">
		{#each filtered as ex (ex.id)}
			<li>
				<button type="button" class="item" onclick={() => onpick(ex)} disabled={exclude.includes(ex.id)}>
					<span class="name">{ex.name}</span>
					<span class="meta">{ex.muscleGroup} · {ex.equipment}</span>
				</button>
			</li>
		{:else}
			<li class="empty">No exercises match. Add new ones from the Exercises tab.</li>
		{/each}
	</ul>
</div>

<style>
	.search {
		position: relative;
		display: flex;
		align-items: center;
	}
	.search :global(svg) {
		position: absolute;
		left: 0.75rem;
		color: var(--steel);
	}
	.search input {
		padding-left: 2.3rem;
	}
	.chips {
		display: flex;
		gap: 0.4rem;
		margin: 0.75rem 0;
		overflow-x: auto;
		scrollbar-width: none;
	}
	.chips button {
		flex: none;
		padding: 0.35rem 0.75rem;
		border: 1.5px solid var(--line-strong);
		border-radius: 999px;
		background: transparent;
		font: inherit;
		font-size: 0.85rem;
		font-weight: 650;
		cursor: pointer;
	}
	.chips button.on {
		background: var(--chrome);
		border-color: var(--lime);
		color: var(--lime);
	}
	.item {
		display: grid;
		width: 100%;
		padding: 0.7rem 0.25rem;
		border: 0;
		background: none;
		text-align: left;
		font: inherit;
		cursor: pointer;
	}
	.item:hover {
		background: var(--paper);
	}
	.item:disabled {
		opacity: 0.4;
	}
	.name {
		font-weight: 700;
	}
	.meta {
		font-size: 0.82rem;
		color: var(--steel);
	}
</style>
