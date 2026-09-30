<script lang="ts">
	import { formatDuration } from '$lib/units';

	let {
		endsAt,
		total,
		offsetMs,
		onadjust,
		onskip
	}: {
		endsAt: string | null;
		total: number | null;
		offsetMs: number;
		onadjust: (delta: number) => void;
		onskip: () => void;
	} = $props();

	let now = $state(Date.now());
	let alerted = $state<string | null>(null);

	$effect(() => {
		const t = setInterval(() => (now = Date.now()), 250);
		return () => clearInterval(t);
	});

	const remaining = $derived(endsAt ? (new Date(endsAt).getTime() - (now + offsetMs)) / 1000 : null);
	const visible = $derived(remaining != null && remaining > -4);
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

{#if visible}
	<div class="rest" class:done role="timer" aria-live="polite">
		<div class="bar" style:width="{pct}%"></div>
		<div class="content">
			<span class="label">{done ? 'Rest over — lift' : 'Rest'}</span>
			<span class="time num">{formatDuration(Math.max(0, Math.ceil(remaining ?? 0)))}</span>
			<div class="controls">
				<button type="button" onclick={() => onadjust(-15)} disabled={done}>−15</button>
				<button type="button" onclick={() => onadjust(15)}>+15</button>
				<button type="button" class="skip" onclick={onskip}>{done ? 'Close' : 'Skip'}</button>
			</div>
		</div>
	</div>
{/if}

<style>
	.rest {
		position: relative;
		overflow: hidden;
		border: 1.5px solid var(--line-strong);
		border-radius: var(--radius);
		background: var(--chrome);
		color: var(--ink);
		animation: drop 0.3s var(--ease);
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
	.content {
		position: relative;
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.55rem 0.6rem 0.55rem 0.9rem;
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
		font-size: 1.7rem;
		font-weight: 800;
		font-stretch: 120%;
	}
	.controls {
		display: flex;
		gap: 0.3rem;
	}
	.controls button {
		min-width: 44px;
		min-height: 38px;
		padding: 0 0.6rem;
		border: 1.5px solid currentColor;
		border-radius: var(--radius-sm);
		background: transparent;
		color: inherit;
		font: inherit;
		font-weight: 800;
		cursor: pointer;
	}
	.controls .skip {
		background: var(--lime);
		border-color: var(--lime);
		color: var(--on-lime);
	}
	.done .controls .skip {
		background: var(--on-lime);
		border-color: var(--on-lime);
		color: var(--lime);
	}
	@keyframes drop {
		from {
			transform: translateY(-10px);
			opacity: 0;
		}
	}
	@keyframes flash {
		50% {
			transform: scale(1.02);
		}
	}
</style>
