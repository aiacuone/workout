<script lang="ts">
	import { formatDuration } from '$lib/units';

	let {
		endsAt,
		total,
		offsetMs,
		idleSec,
		onedit
	}: {
		endsAt: string | null;
		total: number | null;
		offsetMs: number;
		idleSec: number;
		onedit: () => void;
	} = $props();

	let now = $state(Date.now());
	let alerted = $state<string | null>(null);

	$effect(() => {
		if (!endsAt) return;
		const t = setInterval(() => (now = Date.now()), 250);
		return () => clearInterval(t);
	});

	const remaining = $derived(endsAt ? (new Date(endsAt).getTime() - (now + offsetMs)) / 1000 : null);
	const running = $derived(remaining != null && remaining > -4);
	const done = $derived(remaining != null && remaining <= 0);
	const pct = $derived(
		remaining != null && total ? Math.max(0, Math.min(1, remaining / total)) * 100 : 0
	);

	function beep() {
		try {
			const ctx = new AudioContext();
			for (const [i, f] of [880, 880, 1320].entries()) {
				const o = ctx.createOscillator();
				const g = ctx.createGain();
				o.frequency.value = f;
				g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.22);
				g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + i * 0.22 + 0.02);
				g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.22 + 0.18);
				o.connect(g).connect(ctx.destination);
				o.start(ctx.currentTime + i * 0.22);
				o.stop(ctx.currentTime + i * 0.22 + 0.2);
			}
			setTimeout(() => ctx.close(), 1200);
		} catch {
			/* audio unavailable */
		}
	}

	$effect(() => {
		if (done && endsAt && alerted !== endsAt && remaining! > -2) {
			alerted = endsAt;
			navigator.vibrate?.([200, 100, 200]);
			beep();
		}
	});
</script>

<button type="button" class="rest" class:done={running && done} class:idle={!running} onclick={onedit} aria-live="polite">
	{#if running}
		<div class="bar" style:width="{pct}%"></div>
		<span class="label">{done ? 'Rest over' : 'Rest'}</span>
		<span class="time num">{formatDuration(Math.max(0, Math.ceil(remaining ?? 0)))}</span>
	{:else}
		<span class="label">Rest</span>
		<span class="time num">{idleSec > 0 ? formatDuration(idleSec) : 'Off'}</span>
	{/if}
</button>

<style>
	.rest {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.65rem;
		width: 100%;
		overflow: hidden;
		margin: 0.55rem 0 0.45rem;
		padding: 0.45rem 0.7rem;
		border: 0;
		border-radius: var(--radius-sm);
		background: var(--chrome);
		color: var(--ink);
		font: inherit;
		text-align: left;
		cursor: pointer;
	}
	.rest:hover {
		filter: brightness(1.08);
	}
	.idle {
		background: var(--paper);
	}
	.bar {
		position: absolute;
		inset: 0 auto 0 0;
		background: linear-gradient(90deg, #152238, #1a3a66);
		transition: width 0.25s linear;
	}
	.done {
		background: var(--lime);
		color: var(--on-lime);
		animation: flash 0.6s ease 2;
	}
	.done .bar {
		display: none;
	}
	.label,
	.time {
		position: relative;
	}
	.label {
		font-size: 0.75rem;
		font-weight: 800;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		opacity: 0.8;
	}
	.time {
		flex: 1;
		font-size: 1.15rem;
		font-weight: 800;
		font-stretch: 120%;
		text-align: right;
	}
	.idle .time {
		font-size: 0.95rem;
	}
	@keyframes flash {
		50% {
			transform: scale(1.02);
		}
	}
</style>
