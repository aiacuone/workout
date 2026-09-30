<script lang="ts">
	import type { ChartConfiguration } from 'chart.js';

	let { config, height = 220 }: { config: ChartConfiguration; height?: number } = $props();

	let canvas: HTMLCanvasElement | undefined = $state();

	$effect(() => {
		if (!canvas) return;
		const cfg = config;
		let chart: import('chart.js').Chart | undefined;
		let cancelled = false;

		import('chart.js/auto').then(({ default: Chart }) => {
			if (cancelled || !canvas) return;
			Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
			Chart.defaults.color = '#7a8883';
			chart = new Chart(canvas, cfg);
		});

		return () => {
			cancelled = true;
			chart?.destroy();
		};
	});
</script>

<div class="chart" style:height="{height}px">
	<canvas bind:this={canvas}></canvas>
</div>

<style>
	.chart {
		position: relative;
		width: 100%;
	}
</style>
