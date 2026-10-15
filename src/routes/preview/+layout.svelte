<script lang="ts">
	import { afterNavigate } from '$app/navigation';
	import { env } from '$env/dynamic/public';
	import { onMount } from 'svelte';

	let { children } = $props();
	const measurementId = env.PUBLIC_GA_MEASUREMENT_ID;

	function gtag(...args: unknown[]) {
		const w = window as typeof window & { dataLayer?: unknown[][] };
		(w.dataLayer ??= []).push(args);
	}

	onMount(() => {
		if (!measurementId) return;
		const script = document.createElement('script');
		script.async = true;
		script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
		document.head.appendChild(script);
		gtag('js', new Date());
		gtag('config', measurementId, { send_page_view: false });
		return () => script.remove();
	});

	afterNavigate(() => {
		if (!measurementId) return;
		gtag('event', 'page_view', {
			page_title: document.title,
			page_location: window.location.href,
			page_path: `${window.location.pathname}${window.location.search}`
		});
	});
</script>

<div class="preview-banner">
	<span><strong>Interactive preview.</strong> This is a demonstration using sample data; anything you enter resets on refresh.</span>
</div>

{@render children()}

<style>
	.preview-banner {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem 1.25rem;
		padding: 0.55rem 1rem;
		border-bottom: 1px solid var(--line);
		background: var(--paper-2);
		color: var(--ink-2);
		font-size: 0.82rem;
		text-align: center;
	}
	@media (max-width: 560px) {
		.preview-banner {
			align-items: flex-start;
			flex-direction: column;
			gap: 0.15rem;
		}
	}
</style>
