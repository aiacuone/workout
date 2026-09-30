<script lang="ts">
	import { formatDuration } from '$lib/units';

	let { since, offsetMs = 0 }: { since: string; offsetMs?: number } = $props();

	let now = $state(Date.now());

	$effect(() => {
		const t = setInterval(() => (now = Date.now()), 1000);
		return () => clearInterval(t);
	});

	const seconds = $derived((now + offsetMs - new Date(since).getTime()) / 1000);
</script>

<span class="num">{formatDuration(seconds)}</span>
