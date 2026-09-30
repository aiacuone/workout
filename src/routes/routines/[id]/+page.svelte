<script lang="ts">
	import { enhance } from '$app/forms';
	import ExercisePicker from '$lib/components/ExercisePicker.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Sheet from '$lib/components/Sheet.svelte';
	import { kgToDisplay } from '$lib/units';

	let { data, form } = $props();

	let picking = $state(false);
	let renaming = $state(false);
	let confirmingDelete = $state(false);
	let addForm: HTMLFormElement | undefined = $state();
	let addId = $state('');

	const unit = $derived(data.prefs?.weightUnit ?? 'kg');

	function pick(ex: { id: string }) {
		addId = ex.id;
		picking = false;
		queueMicrotask(() => addForm?.requestSubmit());
	}

	const autosave = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) =>
		update({ reset: false });
</script>

<svelte:head><title>{data.routine.name} · Ironlog</title></svelte:head>

<div class="page">
	<a class="back" href="/routines"><Icon name="back" size={18} />Routines</a>
	<div class="page-head">
		<div>
			<p class="eyebrow">Routine · {data.items.length} exercises</p>
			<h1>{data.routine.name}</h1>
		</div>
		<button class="btn sm" onclick={() => (renaming = true)}>Edit</button>
	</div>
	{#if data.routine.notes}<p class="notes">{data.routine.notes}</p>{/if}

	{#if data.items.length && !data.active}
		<form method="POST" action="/workout/start" class="start">
			<input type="hidden" name="routineId" value={data.routine.id} />
			<button class="btn primary block"><Icon name="play" size={18} />Start workout</button>
		</form>
	{:else if data.active}
		<p class="muted start">Finish your current workout before starting another.</p>
	{/if}

	<ol class="items">
		{#each data.items as item, i (item.id)}
			<li>
				<div class="item-head">
					<a href="/exercises/{item.exerciseId}?from=/routines/{data.routine.id}" class="name">{item.name}</a>
					<div class="row">
						<form method="POST" action="?/move" use:enhance>
							<input type="hidden" name="itemId" value={item.id} />
							<input type="hidden" name="dir" value="up" />
							<button class="icon-btn" aria-label="Move up" disabled={i === 0}><Icon name="up" size={18} /></button>
						</form>
						<form method="POST" action="?/move" use:enhance>
							<input type="hidden" name="itemId" value={item.id} />
							<input type="hidden" name="dir" value="down" />
							<button class="icon-btn" aria-label="Move down" disabled={i === data.items.length - 1}>
								<Icon name="down" size={18} />
							</button>
						</form>
						<form method="POST" action="?/removeItem" use:enhance>
							<input type="hidden" name="itemId" value={item.id} />
							<button class="icon-btn" aria-label="Remove"><Icon name="trash" size={18} /></button>
						</form>
					</div>
				</div>
				<form method="POST" action="?/updateItem" use:enhance={autosave} class="targets">
					<input type="hidden" name="itemId" value={item.id} />
					<label class="field">
						Sets
						<input
							name="targetSets"
							type="number"
							inputmode="numeric"
							min="1"
							max="20"
							value={item.targetSets}
							onchange={(e) => e.currentTarget.form?.requestSubmit()}
						/>
					</label>
					<label class="field">
						Rep range
						<input
							name="repRange"
							placeholder="8–12"
							value={item.repRange ?? ''}
							onchange={(e) => e.currentTarget.form?.requestSubmit()}
						/>
					</label>
					<label class="field">
						Weight ({unit})
						<input
							name="targetWeight"
							type="number"
							inputmode="decimal"
							step="any"
							placeholder="prev"
							value={kgToDisplay(item.targetWeightKg, unit)}
							onchange={(e) => e.currentTarget.form?.requestSubmit()}
						/>
					</label>
				</form>
			</li>
		{:else}
			<li class="empty">Add the exercises for this routine.</li>
		{/each}
	</ol>

	<button class="btn block" onclick={() => (picking = true)}><Icon name="plus" size={18} />Add exercise</button>

	<div class="danger-zone">
		<button type="button" class="btn danger sm" onclick={() => (confirmingDelete = true)}>Delete routine</button>
	</div>
</div>

<form method="POST" action="?/addExercise" use:enhance bind:this={addForm} hidden>
	<input type="hidden" name="exerciseId" value={addId} />
</form>

<Sheet bind:open={picking} title="Add exercise">
	<ExercisePicker exercises={data.exercises} onpick={pick} />
</Sheet>

<Sheet bind:open={renaming} title="Edit routine">
	<form
		method="POST"
		action="?/rename"
		class="stack"
		use:enhance={() =>
			async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success') renaming = false;
			}}
	>
		{#if form?.error}<p class="form-error">{form.error}</p>{/if}
		<label class="field">Name<input name="name" required maxlength="80" value={data.routine.name} /></label>
		<label class="field">Notes<textarea name="notes" rows="3">{data.routine.notes ?? ''}</textarea></label>
		<button class="btn primary block">Save</button>
	</form>
</Sheet>

<Sheet bind:open={confirmingDelete} title="Delete routine?">
	<p class="muted">
		Remove <strong>{data.routine.name}</strong> from your list? Past workouts stay in history.
	</p>
	{#snippet footer()}
		<form method="POST" action="?/delete" class="delete-actions">
			<button type="button" class="btn block" onclick={() => (confirmingDelete = false)}>Cancel</button>
			<button class="btn danger block">Delete routine</button>
		</form>
	{/snippet}
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
	.start {
		margin-bottom: 1.25rem;
	}
	.items {
		margin: 0 0 1rem;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.75rem;
	}
	.items > li:not(.empty) {
		padding: 0.75rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.item-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
	}
	.item-head .row {
		gap: 0;
	}
	.name {
		font-weight: 800;
		font-stretch: 110%;
		text-decoration: none;
	}
	.targets {
		display: grid;
		grid-template-columns: 0.7fr 1fr 1fr;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}
	.danger-zone {
		margin-top: 2.5rem;
		text-align: center;
	}
	.delete-actions {
		display: grid;
		gap: 0.5rem;
	}
</style>
