<script lang="ts">
	let { onstop, color = 'var(--ink)' }: { onstop: (seconds: number) => void; color?: string } =
		$props();

	let startedAt = $state<number | null>(null);
	let now = $state(Date.now());

	$effect(() => {
		if (startedAt == null) return;
		const t = setInterval(() => (now = Date.now()), 100);
		return () => clearInterval(t);
	});

	const secs = $derived(startedAt == null ? 0 : (now - startedAt) / 1000);

	function toggle() {
		if (startedAt == null) {
			now = Date.now();
			startedAt = now;
			navigator.vibrate?.(40);
		} else {
			const s = Math.round((Date.now() - startedAt) / 1000);
			startedAt = null;
			navigator.vibrate?.([40, 60, 40]);
			onstop(s);
		}
	}
</script>

<button
	type="button"
	class="hold"
	class:running={startedAt != null}
	style:--c={color}
	onclick={toggle}
	aria-label={startedAt == null ? 'Start hold timer' : 'Stop hold timer'}
>
	{#if startedAt == null}
		<svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4v16l13-8z" fill="currentColor" /></svg>
	{:else}
		<span class="num">{secs.toFixed(1)}s</span>
	{/if}
</button>

<style>
	.hold {
		display: inline-grid;
		place-items: center;
		min-width: 38px;
		height: 38px;
		padding: 0 0.5rem;
		border: 1.5px solid var(--c);
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--c);
		font: inherit;
		font-weight: 800;
		cursor: pointer;
	}
	.running {
		background: var(--c);
		color: #fff;
		animation: breathe 1s ease-in-out infinite;
	}
	@keyframes breathe {
		50% {
			opacity: 0.8;
		}
	}
</style>
