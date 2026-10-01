<script lang="ts">
	import '../app.css';
	import { pwaInfo } from 'virtual:pwa-info';
	import { onMount } from 'svelte';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import Icon from '$lib/components/Icon.svelte';
	import Elapsed from '$lib/components/Elapsed.svelte';
	import Toast from '$lib/components/Toast.svelte';

	let { data, children } = $props();

	const tabs = [
		{ href: '/', label: 'Home', icon: 'home' },
		{ href: '/history', label: 'History', icon: 'history' },
		{ href: '/routines', label: 'Routines', icon: 'list' },
		{ href: '/exercises', label: 'Exercises', icon: 'dumbbell' },
		{ href: '/measurements', label: 'Measure', icon: 'ruler' }
	] as const;

	const path = $derived(page.url.pathname);
	const chrome = $derived(!!data.user && path !== '/login');
	const onActive = $derived(path.startsWith('/workout/active'));

	const webManifestLink = pwaInfo ? pwaInfo.webManifest.linkTag : '';

	onMount(async () => {
		if (!pwaInfo) return;
		const { registerSW } = await import('virtual:pwa-register');
		registerSW({ immediate: true });
	});

	// Another device may have started or finished a workout while this one was in the background.
	$effect(() => {
		if (!data.user) return;
		let last = Date.now();
		const refresh = () => {
			if (document.visibilityState !== 'visible' || onActive || Date.now() - last < 5000) return;
			last = Date.now();
			invalidateAll();
		};
		document.addEventListener('visibilitychange', refresh);
		const t = setInterval(refresh, 20000);
		return () => {
			document.removeEventListener('visibilitychange', refresh);
			clearInterval(t);
		};
	});

	function isCurrent(href: string) {
		if (href === '/') return path === '/';
		return path === href || path.startsWith(href + '/');
	}
</script>

<svelte:head>
	{@html webManifestLink}
</svelte:head>

{#if chrome}
	<header class="topbar">
		<a class="brand" href="/">STRONGR</a>
		<nav class="desk-nav" aria-label="Primary">
			{#each tabs as t (t.href)}
				<a href={t.href} aria-current={isCurrent(t.href) ? 'page' : undefined}>{t.label}</a>
			{/each}
		</nav>
		<a class="icon-btn" href="/settings" aria-label="Settings"><Icon name="settings" /></a>
	</header>
{/if}

<main class:with-chrome={chrome} class:with-resume={chrome && data.active && !onActive}>
	{@render children()}
</main>

{#if chrome}
	{#if data.active && !onActive}
		<a class="resume" href="/workout/active">
			<span class="pulse" aria-hidden="true"></span>
			<span class="resume-name">{data.active.name}</span>
			<Elapsed since={data.active.startedAt} />
			<span class="resume-cta">Resume</span>
		</a>
	{/if}

	<nav class="tabbar" aria-label="Primary">
		{#each tabs as t (t.href)}
			<a href={t.href} aria-current={isCurrent(t.href) ? 'page' : undefined}>
				<Icon name={t.icon} />
				<span>{t.label}</span>
			</a>
		{/each}
	</nav>
{/if}

<Toast lift={chrome} raised={chrome && !!data.active && !onActive} />

<style>
	.topbar {
		position: sticky;
		top: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: calc(0.6rem + env(safe-area-inset-top)) 1rem 0.6rem;
		background: var(--topbar);
		backdrop-filter: blur(12px);
		border-bottom: 1px solid var(--line);
	}
	.brand {
		font-weight: 900;
		font-stretch: 125%;
		font-size: 1.25rem;
		letter-spacing: 0.04em;
		text-decoration: none;
		margin-right: auto;
	}
	.desk-nav {
		display: none;
		gap: 0.25rem;
	}
	.desk-nav a {
		padding: 0.45rem 0.75rem;
		border-radius: var(--radius-sm);
		font-weight: 650;
		text-decoration: none;
		color: var(--ink-2);
	}
	.desk-nav a[aria-current='page'] {
		background: var(--chrome);
		color: var(--lime);
	}

	.tabbar {
		position: fixed;
		inset: auto 0 0 0;
		z-index: 30;
		display: grid;
		grid-template-columns: repeat(5, minmax(0, 1fr));
		height: calc(var(--nav-h) + env(safe-area-inset-bottom));
		padding-bottom: env(safe-area-inset-bottom);
		background: var(--chrome);
	}
	.tabbar a {
		display: grid;
		place-items: center;
		align-content: center;
		gap: 2px;
		min-width: 0;
		color: var(--steel);
		font-size: 0.7rem;
		font-weight: 650;
		text-decoration: none;
	}
	.tabbar a[aria-current='page'] {
		color: var(--lime);
	}

	.resume {
		position: fixed;
		inset: auto 0.75rem calc(var(--nav-h) + env(safe-area-inset-bottom) + 0.6rem) 0.75rem;
		z-index: 29;
		display: flex;
		align-items: center;
		gap: 0.6rem;
		padding: 0.7rem 0.9rem;
		border: 1.5px solid var(--lime);
		border-radius: var(--radius);
		background: var(--lime);
		color: var(--on-lime);
		font-weight: 700;
		text-decoration: none;
		box-shadow: var(--shadow);
		animation: rise 0.4s var(--ease);
	}
	.resume-name {
		flex: 1;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}
	.resume-cta {
		padding: 0.2rem 0.6rem;
		border-radius: var(--radius-sm);
		background: var(--on-lime);
		color: var(--lime);
		font-size: 0.85rem;
	}
	.pulse {
		flex: none;
		width: 10px;
		height: 10px;
		border-radius: 50%;
		background: var(--on-lime);
		animation: pulse 2.4s ease-in-out infinite;
	}

	main.with-resume :global(.page) {
		padding-bottom: calc(var(--nav-h) + 6rem + env(safe-area-inset-bottom));
	}

	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.55;
		}
	}
	@keyframes rise {
		from {
			transform: translateY(16px);
			opacity: 0;
		}
	}

	@media (min-width: 900px) {
		.desk-nav {
			display: flex;
		}
		.tabbar {
			display: none;
		}
		.resume {
			left: auto;
			right: 1.5rem;
			bottom: 1.5rem;
			width: 360px;
		}
		main.with-chrome :global(.page) {
			padding-bottom: 6rem;
		}
	}
</style>
