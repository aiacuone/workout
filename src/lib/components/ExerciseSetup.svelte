<script lang="ts">
	import { tick } from 'svelte';
	import Icon from './Icon.svelte';

	let {
		cableHeight,
		seatHeight,
		onchange
	}: {
		cableHeight: string | null;
		seatHeight: string | null;
		onchange: (patch: { cableHeight?: string | null; seatHeight?: string | null }) => void;
	} = $props();

	let addOpen = $state(false);
	let addMenu: HTMLElement | undefined = $state();
	let cableOpen = $state(false);
	let seatOpen = $state(false);
	let cableInput: HTMLInputElement | undefined = $state();
	let seatInput: HTMLInputElement | undefined = $state();
	// Drafts track edits before the parent prop updates. Absent means "use the prop".
	let heightDraft = $state<string | null | undefined>(undefined);
	let seatDraft = $state<string | null | undefined>(undefined);
	const height = $derived(heightDraft !== undefined ? heightDraft : cableHeight);
	const seat = $derived(seatDraft !== undefined ? seatDraft : seatHeight);

	const showHeight = $derived(cableOpen || !!height);
	const showSeat = $derived(seatOpen || !!seat);
	const canAdd = $derived(!showHeight || !showSeat);

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

	async function addDetail(kind: 'height' | 'seat') {
		addOpen = false;
		if (kind === 'height') cableOpen = true;
		else seatOpen = true;
		await tick();
		if (kind === 'height') cableInput?.focus();
		else seatInput?.focus();
	}
</script>

<div class="setup">
	{#if showHeight}
		<label class="chip">
			<span>Height</span>
			<input
				bind:this={cableInput}
				maxlength="20"
				placeholder="–"
				value={height ?? ''}
				onchange={(e) => {
					const next = e.currentTarget.value.trim() || null;
					heightDraft = next;
					if (!next) cableOpen = false;
					onchange({ cableHeight: next });
				}}
			/>
		</label>
	{/if}
	{#if showSeat}
		<label class="chip">
			<span>Seat</span>
			<input
				bind:this={seatInput}
				maxlength="20"
				placeholder="–"
				value={seat ?? ''}
				onchange={(e) => {
					const next = e.currentTarget.value.trim() || null;
					seatDraft = next;
					if (!next) seatOpen = false;
					onchange({ seatHeight: next });
				}}
			/>
		</label>
	{/if}
	{#if canAdd}
		<div class="note-actions" bind:this={addMenu}>
			<button
				type="button"
				class="add-note"
				aria-expanded={addOpen}
				aria-haspopup="menu"
				onclick={() => (addOpen = !addOpen)}
			>
				<Icon name="plus" size={16} />Add
			</button>
			{#if addOpen}
				<div class="note-pick" role="menu">
					{#if !showHeight}
						<button type="button" role="menuitem" onclick={() => addDetail('height')}>Height</button>
					{/if}
					{#if !showSeat}
						<button type="button" role="menuitem" onclick={() => addDetail('seat')}>Seat</button>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.setup {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.15rem 0.35rem;
		margin-top: 0.45rem;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 32px;
		padding: 0 0.45rem;
		border-radius: var(--radius-sm);
		background: var(--paper);
	}
	.chip span {
		font-size: 0.66rem;
		font-weight: 750;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--steel);
	}
	.chip input {
		width: 4.2rem;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--ink);
		font: inherit;
		font-size: 0.88rem;
		font-weight: 700;
	}
	.chip input:focus {
		outline: none;
	}
	.note-actions {
		position: relative;
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
	.add-note {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
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
	.add-note:hover,
	.add-note[aria-expanded='true'] {
		color: var(--ink);
		background: var(--paper-2);
	}
</style>
