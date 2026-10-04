<script lang="ts">
	import type { Delta } from '$lib/records';
	import Icon from './Icon.svelte';

	let { volume, weight }: { volume: Delta | null; weight: Delta | null } = $props();
</script>

{#if volume || weight}
	<span class="trends">
		{#if volume}
			<span class="mark {volume}" title={volume === 'up' ? 'Volume up from last time' : 'Volume down from last time'}>
				<Icon name="volume" size={13} />
				<Icon name={volume} size={14} />
			</span>
		{/if}
		{#if weight}
			<span class="mark {weight}" title={weight === 'up' ? 'Weight up from last time' : 'Weight down from last time'}>
				<Icon name="dumbbell" size={13} />
				<Icon name={weight} size={14} />
			</span>
		{/if}
	</span>
{/if}

<style>
	.trends {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		flex: none;
	}
	.mark {
		display: inline-flex;
		align-items: center;
		gap: 0;
	}
	.up {
		color: var(--ok);
	}
	.down {
		color: var(--danger);
	}
</style>
