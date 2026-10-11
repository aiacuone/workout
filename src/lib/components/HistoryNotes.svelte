<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from '$lib/components/Icon.svelte';
	import HistorySessionNote from '$lib/components/HistorySessionNote.svelte';

	let {
		permanent,
		session,
		onpermanent,
		onsession,
		aside,
		canHeight = false,
		canSeat = false,
		canSupport = false,
		onheight,
		onseat,
		onsupport
	}: {
		permanent: string | null;
		session: string | null;
		onpermanent: (notes: string | null) => void;
		onsession: (notes: string | null) => void;
		aside?: Snippet;
		canHeight?: boolean;
		canSeat?: boolean;
		canSupport?: boolean;
		onheight?: () => void;
		onseat?: () => void;
		onsupport?: () => void;
	} = $props();

	let permanentOpen = $state(false);
	let sessionOpen = $state(false);
	let addOpen = $state(false);
	let addMenu: HTMLElement | undefined = $state();

	const showPermanent = $derived(permanentOpen || !!permanent);
	const showSession = $derived(sessionOpen || !!session);
	const showAdd = $derived(canHeight || canSeat || canSupport || !showPermanent || !showSession);

	$effect(() => {
		if (!addOpen) return;
		const close = (e: PointerEvent) => {
			if (!addMenu?.contains(e.target as Node)) addOpen = false;
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') addOpen = false;
		};
		document.addEventListener('pointerdown', close);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', close);
			document.removeEventListener('keydown', onKey);
		};
	});
</script>

<HistorySessionNote
	bind:open={permanentOpen}
	hideButton
	value={permanent}
	sticky
	label="Sticky note"
	placeholder="Form cues, setup, keep forever…"
	onchange={onpermanent}
/>
<HistorySessionNote
	bind:open={sessionOpen}
	hideButton
	value={session}
	label="Note"
	placeholder="Changes for next time…"
	onchange={onsession}
/>
{#if showAdd || aside}
	<div class="foot">
		{#if showAdd}
			<div class="note-actions" bind:this={addMenu}>
				<button
					type="button"
					class="add-note"
					aria-label="Add"
					aria-expanded={addOpen}
					aria-haspopup="menu"
					onclick={() => (addOpen = !addOpen)}
				>
					<Icon name="plus" size={16} />
				</button>
				{#if addOpen}
					<div class="note-pick" role="menu">
						{#if canHeight}
							<button
								type="button"
								role="menuitem"
								onclick={() => {
									addOpen = false;
									onheight?.();
								}}>Height</button
							>
						{/if}
						{#if canSeat}
							<button
								type="button"
								role="menuitem"
								onclick={() => {
									addOpen = false;
									onseat?.();
								}}>Seat</button
							>
						{/if}
						{#if canSupport}
							<button
								type="button"
								role="menuitem"
								onclick={() => {
									addOpen = false;
									onsupport?.();
								}}>Support</button
							>
						{/if}
						{#if !showPermanent}
							<button
								type="button"
								role="menuitem"
								onclick={() => {
									addOpen = false;
									permanentOpen = true;
								}}>Sticky note</button
							>
						{/if}
						{#if !showSession}
							<button
								type="button"
								role="menuitem"
								onclick={() => {
									addOpen = false;
									sessionOpen = true;
								}}>Note</button
							>
						{/if}
					</div>
				{/if}
			</div>
		{/if}
		<div class="aside">{@render aside?.()}</div>
	</div>
{/if}

<style>
	.foot {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 0.3rem;
		padding-top: 0.3rem;
		border-top: 1px dashed var(--line);
	}
	.aside {
		margin-left: auto;
	}
	.note-actions {
		position: relative;
	}
	.add-note {
		display: inline-grid;
		place-items: center;
		width: 1.75rem;
		height: 1.75rem;
		padding: 0;
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--steel);
		cursor: pointer;
	}
	.add-note:hover,
	.add-note[aria-expanded='true'] {
		color: var(--ink);
		background: var(--paper-2);
	}
	.note-pick {
		position: absolute;
		left: 0;
		bottom: calc(100% + 0.25rem);
		z-index: 5;
		display: grid;
		min-width: 9.5rem;
		padding: 0.25rem;
		border: 1.5px solid var(--line-strong);
		border-radius: var(--radius-sm);
		background: var(--surface);
		box-shadow: var(--shadow);
	}
	.note-pick button {
		padding: 0.45rem 0.6rem;
		border: 0;
		border-radius: calc(var(--radius-sm) - 2px);
		background: transparent;
		color: var(--ink);
		font: inherit;
		font-size: 0.88rem;
		font-weight: 650;
		text-align: left;
		cursor: pointer;
	}
	.note-pick button:hover {
		background: var(--paper-2);
	}
</style>
