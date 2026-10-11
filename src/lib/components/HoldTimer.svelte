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
		width: 32px;
		height: 32px;
		padding: 0;
		border: 1.5px solid color-mix(in srgb, var(--c) 40%, var(--line-strong));
		border-radius: var(--radius-sm);
		background: transparent;
		color: color-mix(in srgb, var(--c) 65%, var(--ink-2));
		font: inherit;
		font-weight: 800;
		cursor: pointer;
	}
	.running {
		width: auto;
		min-width: 32px;
		padding: 0 0.35rem;
		background: color-mix(in srgb, var(--c) 55%, var(--line-strong));
		color: var(--ink);
		font-size: 0.75rem;
		animation: breathe 1s ease-in-out infinite;
	}
	@keyframes breathe {
		50% {
			opacity: 0.8;
		}
	}
</style>
