<script lang="ts">
	import { notePoints } from '$lib/note-points';

	let { notes }: { notes: string } = $props();
	const points = $derived(notePoints(notes));
</script>

{#if points.length}
	<ul class="points">
		{#each points as point, i (i)}
			<li><span class="dot" aria-hidden="true"></span>{point}</li>
		{/each}
	</ul>
{/if}

<style>
	.points {
		margin: 0.2rem 0 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.2rem;
	}
	.points li {
		display: flex;
		align-items: baseline;
		gap: 0.45rem;
	}
	.dot {
		width: 0.35rem;
		height: 0.35rem;
		border-radius: 50%;
		background: currentColor;
		flex: none;
		transform: translateY(-0.05rem);
	}
</style>
