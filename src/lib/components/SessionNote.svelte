<script lang="ts">
	let {
		value,
		label,
		placeholder,
		open = $bindable(false),
		onchange
	}: {
		value: string | null;
		label: string;
		placeholder: string;
		open?: boolean;
		onchange: (notes: string | null) => void;
	} = $props();

	let draft = $state('');
	let area: HTMLTextAreaElement | undefined = $state();
	// Focus once per open. Saving updates `value` while the field stays open, and refocusing then pulls the cursor back.
	let focused = false;

	const showing = $derived(open || !!value);

	$effect(() => {
		if (!open) {
			draft = value ?? '';
			focused = false;
			return;
		}
		if (!focused) draft = value ?? '';
		const el = area;
		if (!focused && el) {
			focused = true;
			queueMicrotask(() => el.focus());
		}
	});

	function commit() {
		const next = draft.trim() || null;
		onchange(next);
		open = !!next;
		draft = next ?? '';
	}
</script>

{#if showing}
	<label class="note-field">
		<span class="eyebrow">{label}</span>
		<textarea
			bind:this={area}
			rows="2"
			{placeholder}
			bind:value={draft}
			onfocus={() => (open = true)}
			onblur={commit}
		></textarea>
	</label>
{/if}

<style>
	.note-field {
		display: grid;
		gap: 0.3rem;
		min-width: 0;
	}
	.note-field textarea {
		width: 100%;
		min-height: 2.6rem;
		resize: vertical;
		padding: 0.5rem 0.6rem;
		border: 1.5px solid var(--line-strong);
		border-radius: var(--radius-sm);
		background: var(--paper);
		color: var(--ink);
		font: inherit;
		font-size: 0.9rem;
	}
	.note-field textarea:focus {
		outline: none;
		border-color: var(--lime);
	}
</style>
