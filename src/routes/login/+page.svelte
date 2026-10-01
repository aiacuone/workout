<script lang="ts">
	import { enhance } from '$app/forms';
	import { toastFormError } from '$lib/toast.svelte';

	let { data, form } = $props();
	let busy = $state(false);
</script>

<svelte:head><title>{data.setup ? 'Set up' : 'Sign in'} · Ironlog</title></svelte:head>

<div class="screen">
	<div class="plate" aria-hidden="true"></div>
	<section class="panel">
		<h1 class="wordmark">IRONLOG</h1>
		<p class="lede">
			{data.setup
				? 'Create the one account for this log. Signup closes after this.'
				: 'Every set, drop and hold — logged.'}
		</p>

		<form
			method="POST"
			action={data.setup ? '?/setup' : '?/login'}
			class="stack"
			use:enhance={() => {
				busy = true;
				return async ({ result, update }) => {
					await update();
					busy = false;
					if (result.type === 'failure') toastFormError(result.data);
				};
			}}
		>
			<label class="field">
				Username
				<input
					name="username"
					autocomplete="username"
					autocapitalize="none"
					required
					value={form?.username ?? ''}
				/>
			</label>
			<label class="field">
				Password
				<input
					name="password"
					type="password"
					autocomplete={data.setup ? 'new-password' : 'current-password'}
					required
				/>
			</label>
			{#if data.setup}
				<label class="field">
					Confirm password
					<input name="confirm" type="password" autocomplete="new-password" required />
				</label>
			{/if}
			<button class="btn primary block" disabled={busy}>
				{data.setup ? 'Create account' : 'Sign in'}
			</button>
		</form>
	</section>
</div>

<style>
	.screen {
		position: relative;
		min-height: 100dvh;
		display: grid;
		align-items: end;
		overflow: hidden;
		background:
			linear-gradient(180deg, rgba(14, 17, 24, 0) 0%, rgba(14, 17, 24, 0.92) 70%),
			repeating-linear-gradient(90deg, #1b2433 0 2px, #0e1118 2px 22px);
		color: #c9d3cf;
	}
	.plate {
		position: absolute;
		top: -18vmax;
		right: -22vmax;
		width: 70vmax;
		height: 70vmax;
		border-radius: 50%;
		background:
			radial-gradient(circle, #141a24 0 9%, transparent 9.2%),
			radial-gradient(circle, #2f7bff 0 30%, #1b63e0 30.5% 31.5%, #2f7bff 32% 48%, transparent 48.3%);
		animation: spin 60s linear infinite;
		opacity: 0.95;
	}
	.panel {
		position: relative;
		width: min(100%, 440px);
		min-width: 0;
		padding: 2rem 1.25rem calc(2rem + env(safe-area-inset-bottom));
		display: grid;
		gap: 1.25rem;
		animation: enter 0.7s var(--ease);
	}
	.wordmark {
		font-size: clamp(2.8rem, 13.5vw, 5.5rem);
		font-stretch: 125%;
		font-weight: 900;
		letter-spacing: -0.02em;
		line-height: 0.9;
		color: var(--lime);
	}
	.lede {
		font-size: 1.05rem;
		color: #c9d3cf;
		max-width: 30ch;
	}
	.panel :global(label.field) {
		color: #c9d3cf;
	}
	.panel :global(label.field input) {
		background: rgba(251, 252, 251, 0.96);
		border-color: transparent;
		color: #0e1118;
		caret-color: #0e1118;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}
	@keyframes enter {
		from {
			opacity: 0;
			transform: translateY(24px);
		}
	}

	@media (min-width: 900px) {
		.screen {
			align-items: center;
		}
		.panel {
			margin-left: 8vw;
		}
	}
</style>
