<script lang="ts">
	let { children }: { children: import('svelte').Snippet } = $props();
</script>

<aside class="preview-note">
	<strong>Preview guide</strong>
	<span>{@render children()}</span>
</aside>

<style>
	.preview-note {
		display: grid;
		gap: 0.2rem;
		margin: 0.8rem 0 1.25rem;
		padding: 0.8rem 0.9rem;
		border-left: 3px solid var(--lime);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		background: var(--paper-2);
		color: var(--ink-2);
		font-size: 0.9rem;
	}
	.preview-note strong {
		color: var(--ink);
	}
</style>
