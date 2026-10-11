<script lang="ts">
	import Icon from '$lib/components/Icon.svelte';
	import SessionNote from '$lib/components/SessionNote.svelte';

	let {
		value,
		onchange,
		label = 'Session note',
		placeholder = 'Changes for next time…',
		addLabel = 'Note'
	}: {
		value: string | null;
		onchange: (notes: string | null) => void;
		label?: string;
		placeholder?: string;
		addLabel?: string;
	} = $props();

	let open = $state(false);
</script>

<div class="wrap">
	<SessionNote
		bind:open
		{value}
		{label}
		{placeholder}
		{onchange}
	/>
	{#if !open && !value}
		<button type="button" class="add-note" onclick={() => (open = true)}>
			<Icon name="plus" size={16} />{addLabel}
		</button>
	{/if}
</div>

<style>
	.wrap {
		display: grid;
		gap: 0.35rem;
		margin-top: 0.55rem;
	}
	.add-note {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		justify-self: start;
		padding: 0.35rem 0.55rem;
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--steel);
		font: inherit;
		font-size: 0.85rem;
		font-weight: 650;
		cursor: pointer;
	}
	.add-note:hover {
		color: var(--ink);
		background: var(--paper-2);
	}
</style>
