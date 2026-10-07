<script lang="ts">
	import type { RepTrend, TrendSide } from '$lib/records';
	import { kgToDisplay, type WeightUnit } from '$lib/units';
	import Icon from './Icon.svelte';

	let {
		volume,
		weight,
		reps = null,
		unit
	}: {
		volume: TrendSide | null;
		weight: TrendSide | null;
		reps?: RepTrend | null;
		unit: WeightUnit;
	} = $props();

	function amount(side: TrendSide) {
		if (side.deltaKg == null) return '';
		return kgToDisplay(Math.abs(side.deltaKg), unit);
	}

	function title(kind: string, side: TrendSide) {
		const dir = side.direction === 'up' ? 'up' : 'down';
		const shown = amount(side);
		if (!shown) return `${kind} ${dir} from last time`;
		return `${kind} ${dir} ${shown} ${unit} from last time`;
	}

	function repTitle(side: RepTrend) {
		const dir = side.direction === 'up' ? 'up' : 'down';
		const n = Math.abs(side.delta);
		return `Reps ${dir} ${n} from last time`;
	}
</script>

{#if volume || weight || reps}
	<span class="trends">
		{#if volume}
			{@const shown = amount(volume)}
			<span class="mark {volume.direction}" title={title('Volume', volume)}>
				<Icon name="volume" size={13} />
				{#if shown}<span class="amt">{shown}</span>{/if}
			</span>
		{/if}
		{#if weight}
			{@const shown = amount(weight)}
			<span class="mark {weight.direction}" title={title('Weight', weight)}>
				<Icon name="dumbbell" size={13} />
				{#if shown}<span class="amt">{shown}</span>{/if}
			</span>
		{/if}
		{#if reps}
			<span class="mark {reps.direction}" title={repTitle(reps)}>
				<Icon name="reps" size={13} />
				<span class="amt">{Math.abs(reps.delta)}</span>
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
	.amt {
		margin-left: 0.08rem;
		font-size: 0.72rem;
		font-weight: 750;
		font-stretch: 100%;
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}
	.up {
		color: var(--ok);
	}
	.down {
		color: var(--danger);
	}
</style>
