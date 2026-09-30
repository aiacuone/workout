<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import ExerciseForm from '$lib/components/ExerciseForm.svelte';
	import ExerciseHistory from '$lib/components/ExerciseHistory.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Sheet from '$lib/components/Sheet.svelte';

	let { data, form } = $props();
	let editing = $state(false);
	const unit = $derived(data.prefs?.weightUnit ?? 'kg');

	const back = $derived.by(() => {
		const from = page.url.searchParams.get('from');
		if (!from || !from.startsWith('/') || from.startsWith('//') || from.includes('://')) {
			return { href: '/exercises', label: 'Exercises' };
		}
		if (from.startsWith('/history/')) return { href: from, label: 'Workout' };
		if (from.startsWith('/routines/')) return { href: from, label: 'Routine' };
		if (from === '/history') return { href: from, label: 'History' };
		if (from === '/routines') return { href: from, label: 'Routines' };
		return { href: from, label: 'Back' };
	});
</script>

<svelte:head><title>{data.exercise.name} · Ironlog</title></svelte:head>

<div class="page">
	<a class="back" href={back.href}><Icon name="back" size={18} />{back.label}</a>
	<div class="page-head">
		<div>
			<p class="eyebrow">{data.exercise.muscleGroup} · {data.exercise.equipment}</p>
			<h1>{data.exercise.name}</h1>
		</div>
		<button class="btn sm" onclick={() => (editing = true)}>Edit</button>
	</div>

	{#if data.exercise.archived}
		<form method="POST" action="?/restore" use:enhance class="archived">
			<span>This exercise is archived and hidden from pickers.</span>
			<button class="btn sm">Restore</button>
		</form>
	{/if}
	{#if data.exercise.notes}<p class="notes">{data.exercise.notes}</p>{/if}

	<ExerciseHistory sessions={data.history} {unit} />
</div>

<Sheet bind:open={editing} title="Edit exercise">
	<form
		method="POST"
		action="?/update"
		class="stack"
		use:enhance={() =>
			async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success') editing = false;
			}}
	>
		{#if form?.error}<p class="form-error">{form.error}</p>{/if}
		<ExerciseForm values={data.exercise} muscleGroups={data.muscleGroups} equipment={data.equipment} />
		<button class="btn primary block">Save</button>
	</form>
	{#if !data.exercise.archived}
		<form method="POST" action="?/archive" class="archive-form">
			<button class="btn danger block">Archive exercise</button>
		</form>
	{/if}
</Sheet>

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		margin-bottom: 0.75rem;
		font-weight: 650;
		color: var(--steel);
		text-decoration: none;
	}
	.notes {
		margin-bottom: 1rem;
		color: var(--ink-2);
	}
	.archived {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
		padding: 0.6rem 0.8rem;
		border-radius: var(--radius-sm);
		background: var(--paper-2);
		font-size: 0.9rem;
	}
	.archive-form {
		margin-top: 0.75rem;
	}
</style>
