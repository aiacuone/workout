<script lang="ts">
	import { toastState } from '$lib/toast.svelte';

	let { lift = false, raised = false }: { lift?: boolean; raised?: boolean } = $props();

	let el = $state<HTMLDivElement | undefined>();

	$effect(() => {
		const node = el;
		const open = !!toastState.message;
		if (!node) return;
		if (open) {
			if (!node.matches(':popover-open')) node.showPopover();
		} else if (node.matches(':popover-open')) {
			node.hidePopover();
		}
	});
</script>

<div
	bind:this={el}
	popover="manual"
	class="toast"
	class:error={toastState.kind === 'error'}
	class:lift
	class:raised
	role={toastState.kind === 'error' ? 'alert' : 'status'}
>
	{toastState.message}
</div>

<style>
	.toast {
		position: fixed;
		inset: auto auto 1.25rem 50%;
		z-index: 1;
		width: min(28rem, calc(100vw - 1.5rem));
		height: auto;
		margin: 0;
		padding: 0.8rem 1rem;
		border: 1px solid var(--line-strong);
		border-radius: var(--radius);
		background: var(--chrome);
		color: var(--ink);
		font-weight: 650;
		box-shadow: var(--shadow);
		transform: translateX(-50%);
		animation: rise 0.25s var(--ease);
	}
	.toast.lift {
		bottom: calc(var(--nav-h) + env(safe-area-inset-bottom) + 0.85rem);
	}
	.toast.raised {
		bottom: calc(var(--nav-h) + env(safe-area-inset-bottom) + 4.6rem);
	}
	.toast.error {
		border-left: 3px solid var(--danger);
		color: var(--danger);
	}

	@keyframes rise {
		from {
			transform: translate(-50%, 10px);
			opacity: 0;
		}
	}

	@media (min-width: 900px) {
		.toast.lift,
		.toast.raised {
			bottom: 1.5rem;
		}
	}
</style>
