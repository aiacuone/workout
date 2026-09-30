<script lang="ts">
	import type { Snippet } from 'svelte';
	import Icon from './Icon.svelte';

	let {
		open = $bindable(false),
		title,
		children,
		footer,
		onclose
	}: {
		open?: boolean;
		title: string;
		children: Snippet;
		footer?: Snippet;
		onclose?: () => void;
	} = $props();

	let dialog: HTMLDialogElement | undefined = $state();

	$effect(() => {
		if (!dialog) return;
		if (open && !dialog.open) {
			dialog.showModal();
			// showModal focuses the first tabbable (close); wait a tick then move to the marked field.
			const focus = () =>
				(dialog.querySelector('[data-autofocus]') as HTMLElement | null)?.focus({
					preventScroll: true
				});
			requestAnimationFrame(() => requestAnimationFrame(focus));
		}
		if (!open && dialog.open) dialog.close();
	});

	function handleClose() {
		open = false;
		onclose?.();
	}
</script>

<dialog
	bind:this={dialog}
	onclose={handleClose}
	onclick={(e) => {
		if (e.target === dialog) open = false;
	}}
>
	{#if open}
		<div class="sheet">
			<header>
				<h2>{title}</h2>
				<button type="button" class="icon-btn" aria-label="Close" onclick={() => (open = false)}>
					<Icon name="x" />
				</button>
			</header>
			<div class="body">{@render children()}</div>
			{#if footer}<footer>{@render footer()}</footer>{/if}
		</div>
	{/if}
</dialog>

<style>
	dialog {
		width: 100%;
		max-width: 560px;
		max-height: 92dvh;
		margin: auto auto 0;
		padding: 0;
		border: 0;
		border-radius: 18px 18px 0 0;
		background: var(--surface);
		color: var(--ink);
		box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.45);
	}
	dialog[open] {
		animation: slide 0.32s var(--ease);
	}
	dialog::backdrop {
		background: rgba(0, 0, 0, 0.65);
		animation: fade 0.25s ease;
	}
	.sheet {
		display: flex;
		flex-direction: column;
		max-height: 92dvh;
	}
	header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1rem 1rem 0.5rem 1.25rem;
	}
	header::before {
		content: '';
		position: absolute;
		top: 7px;
		left: 50%;
		width: 40px;
		height: 4px;
		margin-left: -20px;
		border-radius: 2px;
		background: var(--line-strong);
	}
	.body {
		overflow-y: auto;
		padding: 0.5rem 1.25rem 1.25rem;
		overscroll-behavior: contain;
	}
	footer {
		padding: 0.75rem 1.25rem calc(0.75rem + env(safe-area-inset-bottom));
		border-top: 1px solid var(--line);
	}

	@keyframes slide {
		from {
			transform: translateY(100%);
		}
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}

	@media (min-width: 700px) {
		dialog {
			margin: auto;
			border-radius: 18px;
		}
		dialog[open] {
			animation: pop 0.25s var(--ease);
		}
		@keyframes pop {
			from {
				transform: translateY(20px);
				opacity: 0;
			}
		}
	}
</style>
