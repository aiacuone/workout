<script lang="ts">
	import type { ChartConfiguration } from 'chart.js';
	import Chart from '$lib/components/Chart.svelte';
	import PreviewNote from '$lib/preview/PreviewNote.svelte';
	import { addPreviewWeight, previewSession } from '$lib/preview/session.svelte';

	let weight = $state(82);
	const chartConfig = $derived<ChartConfiguration>({
		type: 'line',
		data: {
			labels: previewSession.measurements.map((entry) =>
				new Date(`${entry.date}T12:00:00`).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
			),
			datasets: [
				{
					label: 'Weight (kg)',
					data: previewSession.measurements.map((entry) => entry.weight),
					borderColor: '#2f7bff',
					backgroundColor: 'rgba(47, 123, 255, .16)',
					fill: true,
					tension: 0.3
				}
			]
		},
		options: {
			responsive: true,
			maintainAspectRatio: false,
			plugins: { legend: { display: false } },
			scales: { y: { suggestedMin: 80, suggestedMax: 86 } }
		}
	});

	function add(event: SubmitEvent) {
		event.preventDefault();
		addPreviewWeight(Number(weight));
	}
</script>

<svelte:head><title>Measurements preview · Strongr</title></svelte:head>

<div class="page">
	<div class="page-head">
		<div>
			<p class="eyebrow">Body progress</p>
			<h1>Measurements</h1>
		</div>
	</div>
	<PreviewNote>The chart tracks weight over time. Add a sample reading to see it update; it disappears when the page refreshes.</PreviewNote>

	<section class="chart-card">
		<div class="latest">
			<span class="eyebrow">Latest weight</span>
			<strong class="num">{previewSession.measurements.at(-1)?.weight} kg</strong>
		</div>
		<Chart config={chartConfig} height={240} />
	</section>

	<form class="entry" onsubmit={add}>
		<label for="preview-weight">Try logging a weight</label>
		<div class="row">
			<input id="preview-weight" class="input" type="number" min="30" max="300" step="0.1" bind:value={weight} />
			<button class="btn primary" type="submit">Add to chart</button>
		</div>
		<p class="muted">Stored in memory only. Refresh to restore the sample.</p>
	</form>
</div>

<style>
	.chart-card,
	.entry {
		padding: 1rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.latest {
		display: grid;
		margin-bottom: 0.5rem;
	}
	.latest strong {
		color: var(--lime);
		font-size: 1.8rem;
	}
	.entry {
		display: grid;
		gap: 0.6rem;
		margin-top: 1rem;
	}
	.entry label {
		font-weight: 750;
	}
	.entry .row {
		flex-wrap: nowrap;
	}
	.entry input {
		flex: 1;
	}
	.entry p {
		margin: 0;
		font-size: 0.82rem;
	}
</style>
