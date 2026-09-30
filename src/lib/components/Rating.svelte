<script lang="ts">
	import { ratingLabel } from '$lib/format';

	let {
		value,
		onchange,
		size = 'md'
	}: { value: number | null; onchange?: (v: number | null) => void; size?: 'sm' | 'md' } = $props();
</script>

{#if onchange}
	<div
		class="rating {size}"
		class:rough={value === 1}
		class:solid={value === 2}
		class:great={value === 3}
		role="radiogroup"
		aria-label="Rating"
	>
		{#each [1, 2, 3] as n (n)}
			<button
				type="button"
				role="radio"
				aria-checked={value === n}
				aria-label={ratingLabel(n)}
				class:on={value != null && n <= value}
				onclick={() => onchange(value === n ? null : n)}
			></button>
		{/each}
	</div>
{:else if value}
	<span
		class="rating {size} static"
		class:rough={value === 1}
		class:solid={value === 2}
		class:great={value === 3}
		title={ratingLabel(value)}
	>
		{#each [1, 2, 3] as n (n)}<i class:on={n <= value}></i>{/each}
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
	.rough .on {
		background: var(--rating-rough);
		border-color: var(--rating-rough);
	}
	.solid .on {
		background: var(--rating-solid);
		border-color: var(--rating-solid);
	}
	.great .on {
		background: var(--rating-great);
		border-color: var(--rating-great);
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
