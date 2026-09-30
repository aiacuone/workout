<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import Icon from './Icon.svelte';
	import Sheet from './Sheet.svelte';

	let {
		routine,
		canStart = true,
		canDelete = false
	}: {
		routine: { id: string; name: string; exercises: { name: string; sets: number }[] };
		canStart?: boolean;
		canDelete?: boolean;
	} = $props();

	let confirming = $state(false);
	let deleting = $state(false);
</script>

<article class="card">
	<a class="main" href="/routines/{routine.id}">
		<h3>{routine.name}</h3>
		<p class="muted">
			{#if routine.exercises.length}
				{routine.exercises.map((e) => `${e.sets}× ${e.name}`).join(', ')}
			{:else}
				No exercises yet
			{/if}
		</p>
	</a>
	{#if canDelete}
		<button
			class="remove"
			type="button"
			aria-label="Delete {routine.name}"
			onclick={() => (confirming = true)}
		>
			<Icon name="trash" size={18} />
		</button>
	{/if}
	{#if canStart && routine.exercises.length}
		<form method="POST" action="/workout/start">
			<input type="hidden" name="routineId" value={routine.id} />
			<button class="start" aria-label="Start {routine.name}"><Icon name="play" size={18} /></button>
		</form>
	{/if}
</article>

{#if canDelete}
	<Sheet bind:open={confirming} title="Delete routine?">
		<p class="muted">
			Remove <strong>{routine.name}</strong> from your list? Past workouts stay in history.
		</p>
		{#snippet footer()}
			<form
				method="POST"
				action="/routines?/delete"
				class="actions"
				use:enhance={() => {
					deleting = true;
					return async ({ result }) => {
						deleting = false;
						if (result.type === 'success' || result.type === 'failure') {
							confirming = false;
							await invalidateAll();
						}
					};
				}}
			>
				<input type="hidden" name="id" value={routine.id} />
				<button type="button" class="btn block" disabled={deleting} onclick={() => (confirming = false)}>
					Cancel
				</button>
				<button class="btn danger block" disabled={deleting}>
					{deleting ? 'Deleting…' : 'Delete routine'}
				</button>
			</form>
		{/snippet}
	</Sheet>
{/if}

<style>
	.card {
		display: flex;
		align-items: stretch;
		border: 1.5px solid var(--ink);
		border-radius: var(--radius);
		background: var(--surface);
		overflow: hidden;
		transition: border-color 0.15s;
	}
	.card:hover {
		border-color: var(--ink);
	}
	.main {
		flex: 1;
		min-width: 0;
		padding: 0.85rem 1rem;
		text-decoration: none;
	}
	.main p {
		margin-top: 0.3rem;
		font-size: 0.85rem;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	form {
		display: flex;
	}
	.start {
		width: 56px;
		border: 0;
		border-left: 1.5px solid var(--ink);
		background: var(--lime);
		color: var(--on-lime);
		cursor: pointer;
	}
	.start:hover {
		background: var(--lime-deep);
	}
	.remove {
		width: 48px;
		border: 0;
		border-left: 1.5px solid var(--ink);
		background: var(--surface);
		color: var(--ink-2);
		cursor: pointer;
	}
	.remove:hover {
		background: color-mix(in srgb, var(--danger) 18%, var(--surface));
		color: var(--danger);
	}
	.actions {
		display: grid;
		gap: 0.5rem;
	}
</style>
