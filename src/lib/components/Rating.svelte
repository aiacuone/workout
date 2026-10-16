<script lang="ts">
	import { RATINGS, ratingColor, ratingLabel } from '$lib/format';

	let {
		value,
		onchange,
		size = 'md'
	}: { value: number | null; onchange?: (v: number | null) => void; size?: 'sm' | 'md' } = $props();
</script>

{#if onchange}
	<div
		class="rating {size}"
		style:--rating={ratingColor(value)}
		role="radiogroup"
		aria-label="Rating"
	>
		{#each RATINGS as r (r.value)}
			<button
				type="button"
				role="radio"
				aria-checked={value === r.value}
				aria-label={r.label}
				class:on={value != null && r.value <= value}
				onclick={() => onchange(value === r.value ? null : r.value)}
			></button>
		{/each}
	</div>
{:else if value}
	<span class="rating {size} static" style:--rating={ratingColor(value)} title={ratingLabel(value)}>
		{#each RATINGS as r (r.value)}<i class:on={r.value <= value}></i>{/each}
	</span>
{/if}

<style>
	.rating {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
	}
	button,
	i {
		display: block;
		width: 26px;
		height: 12px;
		padding: 0;
		border: 1.5px solid var(--ink);
		border-radius: 3px;
		background: transparent;
		cursor: pointer;
		transform: skewX(-18deg);
		transition:
			background-color 0.15s,
			border-color 0.15s;
	}
	i {
		cursor: default;
	}
	.on {
		background: var(--rating);
		border-color: var(--rating);
	}
	.sm button,
	.sm i {
		width: 12px;
		height: 8px;
		border-width: 1.2px;
	}
	.static {
		gap: 2px;
	}
</style>
