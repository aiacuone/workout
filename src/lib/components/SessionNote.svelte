<script lang="ts">
	import { tick } from 'svelte';
	import { joinNotePoints, notePoints } from '$lib/note-points';
	import Icon from './Icon.svelte';

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
	let root: HTMLDivElement | undefined = $state();
	let primed = false;

	const points = $derived(draft ?? notePoints(value).map((text, i) => ({ id: i, text })));
	const showing = $derived(open || !!value);

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
			if (!root?.contains(e.target as Node)) commit(true);
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

	async function addPoint(after?: number) {
		ensureDraft();
		const list = draft ?? [];
		if (after == null) {
			const last = list.at(-1);
			if (last && !last.text.trim()) {
				await tick();
				focusPoint(last.id);
				return;
			}
		}
		const next: Point = { id: seq++, text: '' };
		if (after == null) draft = [...list, next];
		else {
			const at = list.findIndex((p) => p.id === after);
			const index = at === -1 ? list.length : at + 1;
			draft = [...list.slice(0, index), next, ...list.slice(index)];
		}
		await tick();
		focusPoint(next.id);
	}

	function setText(id: number, text: string) {
		ensureDraft();
		const item = draft?.find((p) => p.id === id);
		if (item) item.text = text;
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
		if (!next) open = false;
	}

	function onBlur() {
		queueMicrotask(() => {
			commit(!root?.contains(document.activeElement));
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
	<div class="note-field" class:sticky bind:this={root} role="group" aria-label={label}>
		<div class="box">
			{#if points.length}
				<ul>
					{#each points as item, i (item.id)}
						<li>
							<span class="dot" aria-hidden="true"></span>
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
								onclick={() => removePoint(item.id)}
							>
								<Icon name="x" size={16} />
							</button>
						</li>
					{/each}
				</ul>
			{/if}
			<button
				type="button"
				class="add-point"
				aria-label="Add dot point"
				onmousedown={(e) => e.preventDefault()}
				onclick={() => addPoint()}
			>
				<Icon name="plus" size={14} />
			</button>
		</div>
	</div>
{/if}

<style>
	.note-field {
		display: grid;
		gap: 0.35rem;
		min-width: 0;
		margin-bottom: 0.45rem;
	}
	.box {
		position: relative;
		--note-line: color-mix(in srgb, var(--lime) 40%, var(--line-strong));
		--note-fill: color-mix(in srgb, var(--lime) 7%, var(--paper));
		min-height: 2.6rem;
		padding: 0.35rem 0.2rem 0.85rem 0.55rem;
		border: 1.5px solid var(--note-line);
		border-left-width: 3px;
		border-left-color: var(--lime);
		border-radius: var(--radius-sm);
		background: var(--note-fill);
	}
	.box:focus-within {
		--note-line: var(--lime);
		border-color: var(--lime);
		border-left-color: var(--lime);
	}
	.sticky .box {
		--note-line: color-mix(in srgb, var(--warn-ink) 55%, var(--line-strong));
		--note-fill: color-mix(in srgb, var(--warn-ink) 16%, var(--paper));
		border-left-color: var(--warn-ink);
	}
	.sticky .box:focus-within {
		--note-line: var(--warn-ink);
		border-color: var(--warn-ink);
		border-left-color: var(--warn-ink);
	}
	.sticky .dot,
	.sticky .add-point {
		color: var(--warn-ink);
	}
	.sticky .dot {
		background: var(--warn-ink);
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
		gap: 0.45rem;
		min-width: 0;
		min-height: 1.85rem;
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
		padding: 0.15rem 0;
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
	.remove-point {
		display: inline-grid;
		place-items: center;
		flex: none;
		width: 28px;
		height: 28px;
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
		width: 1.75rem;
		height: 1.75rem;
		padding: 0;
		border: 1.5px solid var(--note-line);
		border-radius: var(--radius);
		background: var(--note-fill);
		color: var(--lime);
		transform: translate(-50%, 50%);
		cursor: pointer;
	}
	.add-point:hover {
		color: var(--ink);
	}
</style>
