<script lang="ts">
	import { hitMethod } from '$lib/hit';

	let { method, full = false }: { method: string; full?: boolean } = $props();
	const m = $derived(hitMethod(method));
</script>

<span class="badge" style:--c={m.color} style:--i={m.ink} title={m.name}>
	{full ? m.name : m.short}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		padding: 0.15rem 0.5rem;
		border-radius: 4px;
		background: var(--c);
		color: var(--i);
		font-size: 0.7rem;
		font-weight: 800;
		font-stretch: 112%;
		letter-spacing: 0.06em;
		white-space: nowrap;
	}
</style>
