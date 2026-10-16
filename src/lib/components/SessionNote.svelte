<script lang="ts">
	import { tick } from 'svelte';
	import { joinNotePoints, notePoints } from '$lib/note-points';
	import Icon from './Icon.svelte';
	import Sheet from './Sheet.svelte';

	let {
		value,
		label,
		placeholder,
		sticky = false,
		open = $bindable(false),
		onchange
	}: {
		value: string | null;
		label: string;
		placeholder: string;
		sticky?: boolean;
		open?: boolean;
		onchange: (notes: string | null) => void;
	} = $props();

	type Point = { id: number; text: string };

	let seq = 1000;
	let draft = $state<Point[] | null>(null);
	let pendingId = $state<number | null>(null);
	let editing = $state(false);
	let root: HTMLDivElement | undefined = $state();
	let primed = false;
	let adding = false;

	const points = $derived(draft ?? notePoints(value).map((text, i) => ({ id: i, text })));
	const pending = $derived(points.find((p) => p.id === pendingId) ?? null);
	const showing = $derived(open || !!value);
	const readOnly = $derived(!editing && notePoints(value).length > 0);

	$effect(() => {
		if (!open) {
			primed = false;
			return;
		}
		if (primed || points.length > 0 || value) return;
		primed = true;
		addPoint();
	});

	$effect(() => {
		if (!open || !root || points.some((p) => p.text.trim()) || value) return;
		const close = (e: PointerEvent) => {
			if (pendingId != null || root?.contains(e.target as Node)) return;
			commit(true);
		};
		document.addEventListener('pointerdown', close);
		return () => document.removeEventListener('pointerdown', close);
	});

	$effect(() => {
		if (!editing || !root) return;
		const close = (e: PointerEvent) => {
			if (pendingId != null || adding || root?.contains(e.target as Node)) return;
			commit(true);
		};
		document.addEventListener('pointerdown', close);
		return () => document.removeEventListener('pointerdown', close);
	});

	function ensureDraft() {
		if (draft) return;
		const saved = notePoints(value).map((text, i) => ({ id: i, text }));
		seq = Math.max(seq, saved.length);
		draft = saved;
	}

	function focusPoint(id: number) {
		root?.querySelector<HTMLInputElement>(`[data-point="${id}"]`)?.focus();
	}

	async function startEdit() {
		editing = true;
		open = true;
		ensureDraft();
		await tick();
		const first = points[0];
		if (first) focusPoint(first.id);
	}

	async function addPoint(after?: number) {
		adding = true;
		ensureDraft();
		const list = draft ?? [];
		const next: Point = { id: seq++, text: '' };
		if (after == null) draft = [...list, next];
		else {
			const at = list.findIndex((p) => p.id === after);
			const index = at === -1 ? list.length : at + 1;
			draft = [...list.slice(0, index), next, ...list.slice(index)];
		}
		await tick();
		focusPoint(next.id);
		adding = false;
	}

	function setText(id: number, text: string) {
		ensureDraft();
		const item = draft?.find((p) => p.id === id);
		if (item) item.text = text;
	}

	function askRemove(id: number) {
		pendingId = id;
	}

	function cancelRemove() {
		const id = pendingId;
		pendingId = null;
		if (id != null) tick().then(() => focusPoint(id));
	}

	function confirmRemove() {
		const id = pendingId;
		pendingId = null;
		if (id != null) removePoint(id);
	}

	function removePoint(id: number) {
		ensureDraft();
		const list = draft ?? [];
		const index = list.findIndex((p) => p.id === id);
		const focus = list[index - 1] ?? list[index + 1];
		const kept = list.filter((p) => p.id !== id);
		const next = joinNotePoints(kept.map((p) => p.text));
		if (!next) {
			draft = null;
			editing = false;
			onchange(null);
			open = false;
			return;
		}
		draft = kept;
		onchange(next);
		if (focus) tick().then(() => focusPoint(focus.id));
	}

	function commit(closeIfEmpty: boolean) {
		const next = joinNotePoints(points.map((p) => p.text));
		if (!closeIfEmpty) {
			if (next) onchange(next);
			return;
		}
		onchange(next);
		draft = null;
		editing = false;
		if (!next) open = false;
	}

	function onBlur() {
		queueMicrotask(() => {
			if (pendingId != null || adding || root?.contains(document.activeElement)) return;
			commit(true);
		});
	}

	function onKey(e: KeyboardEvent, id: number) {
		const index = points.findIndex((p) => p.id === id);
		const current = points[index];
		if (!current) return;
		if (e.key === 'Enter') {
			e.preventDefault();
			if (current.text.trim()) addPoint(id);
			return;
		}
		if (e.key === 'Backspace' && current.text === '') {
			e.preventDefault();
			ensureDraft();
			const list = draft ?? [];
			const focus = list[index - 1] ?? list[index + 1];
			draft = list.filter((p) => p.id !== id);
			if (focus && focus.id !== id) tick().then(() => focusPoint(focus.id));
		}
	}
</script>

{#if showing}
	<div class="note-field" class:sticky class:quiet={readOnly} bind:this={root} role="group" aria-label={label}>
		<div class="box">
			{#if points.length}
				<ul>
					{#each points as item, i (item.id)}
						<li>
							<span class="dot" aria-hidden="true"></span>
							{#if readOnly}
								<span class="text">{item.text}</span>
							{:else}
								<input
									data-point={item.id}
									aria-label={label}
									placeholder={i === 0 ? placeholder : ''}
									autocomplete="off"
									value={item.text}
									oninput={(e) => setText(item.id, e.currentTarget.value)}
									onfocus={() => {
										open = true;
										ensureDraft();
									}}
									onblur={onBlur}
									onkeydown={(e) => onKey(e, item.id)}
								/>
								<button
									type="button"
									class="remove-point"
									aria-label="Remove dot point"
									onmousedown={(e) => e.preventDefault()}
									onclick={() => askRemove(item.id)}
								>
									<Icon name="x" size={16} />
								</button>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
			{#if readOnly}
				<button type="button" class="edit-note" aria-label="Edit {label.toLowerCase()}" onclick={startEdit}>
					<Icon name="pencil" size={14} />
				</button>
			{:else}
				<button
					type="button"
					class="add-point"
					aria-label="Add dot point"
					onpointerdown={(e) => {
						e.preventDefault();
						addPoint();
					}}
				>
					<Icon name="plus" size={11} />
				</button>
			{/if}
		</div>
	</div>
{/if}

<Sheet open={pendingId != null} title="Remove this point?" onclose={cancelRemove}>
	<p class="confirm-text">{pending?.text.trim() || 'This point is empty.'}</p>
	{#snippet footer()}
		<div class="actions">
			<button type="button" class="btn block" onclick={cancelRemove}>Cancel</button>
			<button type="button" class="btn danger block" onclick={confirmRemove}>Remove point</button>
		</div>
	{/snippet}
</Sheet>

<style>
	.note-field {
		display: grid;
		gap: 0.35rem;
		min-width: 0;
		margin-bottom: 0.45rem;
	}
	.note-field.quiet {
		margin-bottom: 0.35rem;
	}
	.box {
		position: relative;
		--note-line: color-mix(in srgb, var(--lime) 8%, var(--line));
		--note-fill: color-mix(in srgb, var(--lime) 2%, var(--paper));
		--note-mark: color-mix(in srgb, var(--lime) 18%, var(--line));
		min-height: 2.2rem;
		padding: 0.15rem 0.15rem 0.35rem 0.5rem;
		border: 1px solid var(--note-line);
		border-left-width: 2px;
		border-left-color: var(--note-mark);
		border-radius: var(--radius-sm);
		background: var(--note-fill);
	}
	.box:focus-within {
		--note-line: color-mix(in srgb, var(--lime) 22%, var(--line));
		--note-mark: color-mix(in srgb, var(--lime) 35%, var(--line));
		border-color: var(--note-line);
		border-left-color: var(--note-mark);
	}
	.sticky .box {
		--note-line: color-mix(in srgb, var(--warn-ink) 12%, var(--line));
		--note-fill: color-mix(in srgb, var(--warn-ink) 3%, var(--paper));
		--note-mark: color-mix(in srgb, var(--warn-ink) 20%, var(--line));
	}
	.sticky .box:focus-within {
		--note-line: color-mix(in srgb, var(--warn-ink) 22%, var(--line));
		--note-mark: color-mix(in srgb, var(--warn-ink) 32%, var(--line));
	}
	.sticky .dot {
		color: color-mix(in srgb, var(--warn-ink) 70%, var(--ink-2));
		background: color-mix(in srgb, var(--warn-ink) 70%, var(--ink-2));
	}
	.sticky .add-point,
	.sticky .edit-note {
		color: color-mix(in srgb, var(--warn-ink) 28%, var(--steel));
	}
	.quiet .box {
		padding: 0.3rem 1.7rem 0.3rem 0.5rem;
	}
	.quiet li {
		align-items: flex-start;
	}
	.quiet .dot {
		margin-top: 0.42rem;
	}
	ul {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
	}
	li {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		min-width: 0;
		min-height: 1.35rem;
	}
	.dot {
		width: 0.4rem;
		height: 0.4rem;
		border-radius: 50%;
		background: var(--ink);
		flex: none;
	}
	input {
		flex: 1;
		min-width: 0;
		padding: 0;
		border: 0;
		border-radius: 0;
		background: transparent;
		color: var(--ink);
		font: inherit;
		font-size: 0.9rem;
	}
	input:focus {
		outline: none;
	}
	.text {
		flex: 1;
		min-width: 0;
		font-size: 0.9rem;
		line-height: 1.35;
		overflow-wrap: anywhere;
	}
	.remove-point {
		display: inline-grid;
		place-items: center;
		flex: none;
		width: 1.25rem;
		height: 1.25rem;
		padding: 0;
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--steel);
		cursor: pointer;
	}
	.remove-point:hover {
		color: var(--ink);
		background: var(--paper-2);
	}
	.add-point {
		position: absolute;
		left: 50%;
		bottom: 0;
		display: inline-grid;
		place-items: center;
		width: 1.05rem;
		height: 1.05rem;
		padding: 0;
		border: 1px solid color-mix(in srgb, var(--note-line) 55%, transparent);
		border-radius: 999px;
		background: var(--note-fill);
		color: color-mix(in srgb, var(--note-mark) 40%, var(--steel));
		transform: translate(-50%, 50%);
		cursor: pointer;
	}
	.add-point:hover,
	.add-point:focus-visible {
		color: var(--ink);
		border-color: var(--note-line);
	}
	.edit-note {
		position: absolute;
		top: 0.2rem;
		right: 0.12rem;
		display: inline-grid;
		place-items: center;
		width: 1.35rem;
		height: 1.35rem;
		padding: 0;
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--steel);
		cursor: pointer;
	}
	.edit-note:hover,
	.edit-note:focus-visible {
		color: var(--ink);
		background: var(--paper-2);
	}
	.confirm-text {
		margin: 0;
		color: var(--ink-2);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}
	.actions {
		display: grid;
		gap: 0.5rem;
	}
</style>
