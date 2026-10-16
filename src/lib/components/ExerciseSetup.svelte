<script lang="ts">
	import { tick } from 'svelte';
	import { selectAll } from '$lib/select-all';
	import Icon from './Icon.svelte';

	let {
		cableHeight,
		seatHeight,
		support,
		onchange,
		onhit,
		onnote,
		hideMenu = false,
		request = null,
		onrequest,
		onshown
	}: {
		cableHeight: string | null;
		seatHeight: string | null;
		support: string | null;
		onchange: (patch: { cableHeight?: string | null; seatHeight?: string | null; support?: string | null }) => void;
		onhit?: () => void;
		onnote?: () => void;
		hideMenu?: boolean;
		request?: 'height' | 'seat' | 'support' | null;
		onrequest?: () => void;
		onshown?: (shown: { height: boolean; seat: boolean; support: boolean }) => void;
	} = $props();

	let addOpen = $state(false);
	let addMenu: HTMLElement | undefined = $state();
	let cableOpen = $state(false);
	let seatOpen = $state(false);
	let supportOpen = $state(false);
	let cableInput: HTMLInputElement | undefined = $state();
	let seatInput: HTMLInputElement | undefined = $state();
	let supportInput: HTMLInputElement | undefined = $state();
	// Drafts track edits before the parent prop updates. Absent means "use the prop".
	let heightDraft = $state<string | null | undefined>(undefined);
	let seatDraft = $state<string | null | undefined>(undefined);
	let supportDraft = $state<string | null | undefined>(undefined);
	const height = $derived(heightDraft !== undefined ? heightDraft : cableHeight);
	const seat = $derived(seatDraft !== undefined ? seatDraft : seatHeight);
	const supportValue = $derived(supportDraft !== undefined ? supportDraft : support);

	const showHeight = $derived(cableOpen || !!height);
	const showSeat = $derived(seatOpen || !!seat);
	const showSupport = $derived(supportOpen || !!supportValue);
	const showAdd = $derived(!hideMenu && (!showHeight || !showSeat || !showSupport || !!onhit || !!onnote));
	const visible = $derived(showHeight || showSeat || showSupport || showAdd);

	$effect(() => {
		onshown?.({ height: showHeight, seat: showSeat, support: showSupport });
	});

	$effect(() => {
		const kind = request;
		if (!kind) return;
		onrequest?.();
		addDetail(kind);
	});

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

	async function addDetail(kind: 'height' | 'seat' | 'support') {
		addOpen = false;
		if (kind === 'height') cableOpen = true;
		else if (kind === 'seat') seatOpen = true;
		else supportOpen = true;
		await tick();
		if (kind === 'height') cableInput?.focus();
		else if (kind === 'seat') seatInput?.focus();
		else supportInput?.focus();
	}
</script>

{#if visible}
<div class="setup">
	{#if showHeight}
		<label class="chip">
			<span>Height</span>
			<input
				bind:this={cableInput}
				inputmode="numeric"
				maxlength="20"
				placeholder="–"
				data-select-all
				value={height ?? ''}
				onfocus={selectAll}
				onpointerup={selectAll}
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
				inputmode="numeric"
				maxlength="20"
				placeholder="–"
				data-select-all
				value={seat ?? ''}
				onfocus={selectAll}
				onpointerup={selectAll}
				onchange={(e) => {
					const next = e.currentTarget.value.trim() || null;
					seatDraft = next;
					if (!next) seatOpen = false;
					onchange({ seatHeight: next });
				}}
			/>
		</label>
	{/if}
	{#if showSupport}
		<label class="chip">
			<span>Support</span>
			<input
				bind:this={supportInput}
				maxlength="20"
				placeholder="–"
				data-select-all
				value={supportValue ?? ''}
				onfocus={selectAll}
				onpointerup={selectAll}
				onchange={(e) => {
					const next = e.currentTarget.value.trim() || null;
					supportDraft = next;
					if (!next) supportOpen = false;
					onchange({ support: next });
				}}
			/>
		</label>
	{/if}
	{#if showAdd}
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
					{#if !showSupport}
						<button type="button" role="menuitem" onclick={() => addDetail('support')}>Support</button>
					{/if}
					{#if onhit}
						<button
							type="button"
							role="menuitem"
							onclick={() => {
								addOpen = false;
								onhit?.();
							}}>HIT method</button
						>
					{/if}
					{#if onnote}
						<button
							type="button"
							role="menuitem"
							onclick={() => {
								addOpen = false;
								onnote?.();
							}}>Sticky note</button>
						>
					{/if}
				</div>
			{/if}
		</div>
	{/if}
</div>
{/if}

<style>
	.setup {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.1rem 0.55rem;
		margin-top: 0.15rem;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		min-height: 1.5rem;
		padding: 0;
		border-radius: var(--radius-sm);
		background: transparent;
	}
	.chip span {
		font-size: 0.66rem;
		font-weight: 750;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--steel);
	}
	.chip input {
		width: 2.4rem;
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
