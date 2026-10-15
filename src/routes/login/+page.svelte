<script lang="ts">
	let { data } = $props();
</script>

<svelte:head><title>Sign in · Strongr</title></svelte:head>

<div class="screen">
	<div class="plate" aria-hidden="true"></div>
	<section class="panel">
		<h1 class="wordmark">STRONGR</h1>
		<p class="lede">Every set, drop and hold — logged.</p>

		{#if data.error}
			<p class="form-error" role="alert">{data.error}</p>
		{/if}

		{#if data.configured}
			<a class="btn primary block" href="/login/google">Sign in with Google</a>
			<p class="note">Only approved Google accounts can sign in.</p>
		{:else}
			<p class="form-error" role="alert">
				Google sign-in is not set up. Add GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and ALLOWED_EMAILS.
			</p>
		{/if}
		<a class="btn block preview" href="/preview">View interactive preview</a>
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
	.note {
		margin: 0;
		color: #9aa6a1;
		font-size: 0.9rem;
	}
	.preview {
		border-color: #647284;
		color: #c9d3cf;
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
