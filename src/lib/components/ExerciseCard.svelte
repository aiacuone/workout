<script lang="ts">
	import { setSummary } from '$lib/format';
	import type { SetType, SetView, WorkoutExerciseState } from '$lib/types';
	import { displayToKg, kgToDisplay, type WeightUnit } from '$lib/units';
	import type { WorkoutSession } from '$lib/workout/session.svelte';
	import HitBlock from './HitBlock.svelte';
	import Icon from './Icon.svelte';
	import Rating from './Rating.svelte';
	import RestTimer from './RestTimer.svelte';
	import SessionNote from './SessionNote.svelte';

	let {
		we,
		unit,
		exercises,
		session,
		restEndsAt,
		restTotal,
		offsetMs,
		idleSec,
		onhistory,
		onmenu,
		onrest
	}: {
		we: WorkoutExerciseState;
		unit: WeightUnit;
		exercises: { id: string; name: string }[];
		session: WorkoutSession;
		restEndsAt: string | null;
		restTotal: number | null;
		offsetMs: number;
		idleSec: number;
		onhistory: () => void;
		onmenu: () => void;
		onrest: () => void;
	} = $props();

	let shake = $state<string | null>(null);
	let notePicker = $state(false);
	let noteMenu: HTMLElement | undefined = $state();
	let permanentOpen = $state(false);
	let sessionOpen = $state(false);
	let cableOpen = $state(false);
	let seatOpen = $state(false);

	const NEXT_TYPE: Record<SetType, SetType> = { normal: 'warmup', warmup: 'failure', failure: 'normal' };

	const labels = $derived.by(() => {
		let n = 0;
		return we.sets.map((s) => (s.type === 'warmup' ? 'W' : String(++n)));
	});
	const doneCount = $derived(we.sets.filter((s) => s.completed).length);
	const notesVisible = $derived(permanentOpen || sessionOpen || !!we.exerciseNotes || !!we.notes);

	$effect(() => {
		if (!notePicker) return;
		const close = (e: PointerEvent) => {
			if (!noteMenu?.contains(e.target as Node)) notePicker = false;
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') notePicker = false;
		};
		document.addEventListener('pointerdown', close);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', close);
			document.removeEventListener('keydown', onKey);
		};
	});

	function updateSet(set: SetView, patch: Partial<SetView>) {
		Object.assign(set, patch);
		session.send({ op: 'updateSet', setId: set.id, patch });
	}

	function updateExercise(patch: Partial<WorkoutExerciseState>) {
		Object.assign(we, patch);
		if ('exerciseNotes' in patch) {
			for (const other of session.state.exercises) {
				if (other.exerciseId === we.exerciseId) other.exerciseNotes = patch.exerciseNotes ?? null;
			}
		}
		session.send({ op: 'updateExercise', weId: we.id, patch });
	}

	function repsOrNull(v: string) {
		if (v.trim() === '') return null;
		const n = Math.round(Number(v));
		return Number.isFinite(n) && n >= 0 ? n : null;
	}

	function toggle(set: SetView, i: number) {
		if (set.completed) return updateSet(set, { completed: false });
		const p = we.previous?.sets[i];
		const patch: Partial<SetView> = { completed: true };
		if (set.weightKg == null && p?.weightKg != null) patch.weightKg = p.weightKg;
		if (set.reps == null && p?.reps != null) patch.reps = p.reps;
		if ((patch.reps ?? set.reps) == null) {
			shake = set.id;
			setTimeout(() => (shake = null), 450);
			return;
		}
		navigator.vibrate?.(30);
		updateSet(set, patch);
	}

	function removeLastSet() {
		const target = [...we.sets].reverse().find((s) => !s.completed) ?? we.sets.at(-1);
		if (target) session.send({ op: 'removeSet', setId: target.id });
	}
</script>

<article class="card">
	<header>
		<button type="button" class="title" onclick={onhistory}>
			<span class="name">{we.name}</span>
			<span class="meta"><Icon name="chart" size={14} /> {we.muscleGroup} · {doneCount}/{we.sets.length} sets</span>
		</button>
		<button type="button" class="icon-btn" aria-label="Exercise options" onclick={onmenu}><Icon name="more" /></button>
	</header>

	<RestTimer endsAt={restEndsAt} total={restTotal} {offsetMs} {idleSec} onedit={onrest} />

	{#if we.previous?.notes}
		<p class="last-note"><span class="eyebrow">Last time</span> {we.previous.notes}</p>
	{/if}

	<div class="sets" role="table" aria-label="{we.name} sets">
		<div class="row head" role="row">
			<span role="columnheader">Set</span>
			<span role="columnheader">Previous</span>
			<span role="columnheader">{unit}</span>
			<span role="columnheader">Reps</span>
			<span role="columnheader" class="sr">Done</span>
		</div>
		{#each we.sets as set, i (set.id)}
			{@const p = we.previous?.sets[i]}
			<div class="row" class:done={set.completed} class:shake={shake === set.id} role="row">
				<button
					type="button"
					class="type {set.type}"
					title="Tap to change set type"
					onclick={() => updateSet(set, { type: NEXT_TYPE[set.type] })}
				>
					{set.type === 'failure' ? 'F' : labels[i]}
				</button>
				<button
					type="button"
					class="prev num"
					disabled={!p || set.completed}
					onclick={() => p && updateSet(set, { weightKg: p.weightKg, reps: p.reps })}
				>
					{p ? setSummary(p, unit) : '—'}
				</button>
				<input
					class="input num"
					inputmode="decimal"
					aria-label="Weight"
					placeholder={kgToDisplay(p?.weightKg, unit)}
					value={kgToDisplay(set.weightKg, unit)}
					onchange={(e) => updateSet(set, { weightKg: displayToKg(e.currentTarget.value, unit) })}
				/>
				<input
					class="input num"
					inputmode="numeric"
					aria-label="Reps"
					placeholder={p?.reps?.toString() ?? ''}
					value={set.reps ?? ''}
					onchange={(e) => updateSet(set, { reps: repsOrNull(e.currentTarget.value) })}
				/>
				<button
					type="button"
					class="check"
					aria-label={set.completed ? 'Mark set not done' : 'Complete set'}
					aria-pressed={set.completed}
					onclick={() => toggle(set, i)}
				>
					<Icon name="check" size={20} />
				</button>
			</div>
		{/each}
	</div>

	<div class="set-actions">
		<button type="button" class="btn sm ghost" onclick={() => session.send({ op: 'addSet', weId: we.id })}>
			<Icon name="plus" size={16} />Add set
		</button>
		{#if we.sets.length > 0}
			<button type="button" class="btn sm ghost muted" onclick={removeLastSet}>Remove set</button>
		{/if}
	</div>

	{#each we.hits as hit (hit.id)}
		<HitBlock
			{hit}
			prev={we.previous?.hits.find((h) => h.methodKey === hit.methodKey) ?? null}
			{unit}
			{exercises}
			{session}
		/>
	{/each}

	<div class="notes" class:open={notesVisible}>
		<SessionNote
			bind:open={permanentOpen}
			value={we.exerciseNotes}
			label="Permanent note"
			placeholder="Form cues, setup, keep forever…"
			onchange={(exerciseNotes) => updateExercise({ exerciseNotes })}
		/>
		<SessionNote
			bind:open={sessionOpen}
			value={we.notes}
			label="Session note"
			placeholder="Changes for next time…"
			onchange={(notes) => updateExercise({ notes })}
		/>
	</div>

	<footer>
		<div class="tools">
			<label class="chip">
				<span>Range</span>
				<input
					placeholder="8–12"
					value={we.repRange ?? ''}
					onchange={(e) => updateExercise({ repRange: e.currentTarget.value.trim() || null })}
				/>
			</label>
			{#if cableOpen || we.cableHeight}
				<label class="chip">
					<span>Height</span>
					<input
						placeholder="–"
						value={we.cableHeight ?? ''}
						onchange={(e) => {
							const cableHeight = e.currentTarget.value.trim() || null;
							if (!cableHeight) cableOpen = false;
							updateExercise({ cableHeight });
						}}
					/>
				</label>
			{:else}
				<button type="button" class="add-note" onclick={() => (cableOpen = true)}>
					<Icon name="plus" size={16} />Height
				</button>
			{/if}
			{#if seatOpen || we.seatHeight}
				<label class="chip">
					<span>Seat</span>
					<input
						placeholder="–"
						value={we.seatHeight ?? ''}
						onchange={(e) => {
							const seatHeight = e.currentTarget.value.trim() || null;
							if (!seatHeight) seatOpen = false;
							updateExercise({ seatHeight });
						}}
					/>
				</label>
			{:else}
				<button type="button" class="add-note" onclick={() => (seatOpen = true)}>
					<Icon name="plus" size={16} />Seat
				</button>
			{/if}
			<div class="note-actions" bind:this={noteMenu}>
				<button type="button" class="add-note" aria-expanded={notePicker} onclick={() => (notePicker = !notePicker)}>
					<Icon name="plus" size={16} />Note
				</button>
				{#if notePicker}
					<div class="note-pick" role="menu">
						<button
							type="button"
							role="menuitem"
							onclick={() => {
								permanentOpen = true;
								notePicker = false;
							}}>Permanent</button
						>
						<button
							type="button"
							role="menuitem"
							onclick={() => {
								sessionOpen = true;
								notePicker = false;
							}}>Session</button
						>
					</div>
				{/if}
			</div>
		</div>
		<Rating value={we.rating} onchange={(v) => updateExercise({ rating: v })} />
	</footer>
</article>

<style>
	.card {
		padding: 0.85rem 0.85rem 0.7rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
		box-shadow: var(--shadow);
	}
	header {
		display: flex;
		align-items: start;
		gap: 0.5rem;
	}
	.title {
		flex: 1;
		display: grid;
		gap: 0.1rem;
		padding: 0;
		border: 0;
		background: none;
		text-align: left;
		font: inherit;
		cursor: pointer;
	}
	.name {
		font-size: 1.12rem;
		font-weight: 850;
		font-stretch: 112%;
		color: var(--link);
		text-decoration: underline;
		text-decoration-thickness: 1.5px;
		text-underline-offset: 3px;
		text-decoration-color: color-mix(in srgb, var(--link) 40%, transparent);
	}
	.meta {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		font-size: 0.8rem;
		color: var(--steel);
	}
	.note {
		margin-bottom: 0.4rem;
		font-size: 0.85rem;
		font-style: italic;
		color: var(--ink-2);
	}
	.sets {
		display: grid;
		gap: 0.25rem;
	}
	.row {
		display: grid;
		grid-template-columns: 2.4rem minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr) 2.75rem;
		align-items: center;
		gap: 0.4rem;
		padding: 0.15rem 0.2rem;
		border-radius: var(--radius-sm);
		position: relative;
	}
	.row.head {
		font-size: 0.68rem;
		font-weight: 800;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--steel);
		text-align: center;
	}
	.row.head span:nth-child(2) {
		text-align: left;
	}
	.sr {
		visibility: hidden;
	}
	.row.done {
		background: var(--done);
		animation: sweep 0.45s var(--ease);
	}
	.row.shake {
		animation: shake 0.4s;
	}
	.type {
		height: 34px;
		border: 0;
		border-radius: var(--radius-sm);
		background: var(--paper-2);
		font: inherit;
		font-weight: 850;
		cursor: pointer;
	}
	.type.warmup {
		color: var(--warn-ink);
		background: var(--warn-bg);
	}
	.type.failure {
		color: var(--danger);
		background: var(--fail-bg);
	}
	.prev {
		overflow: hidden;
		padding: 0;
		border: 0;
		background: none;
		color: var(--steel);
		font: inherit;
		font-size: 0.83rem;
		text-align: left;
		white-space: nowrap;
		text-overflow: ellipsis;
		cursor: pointer;
	}
	.prev:disabled {
		cursor: default;
	}
	.row .input {
		min-height: 38px;
		padding: 0.3rem;
		text-align: center;
		font-weight: 750;
		background: var(--paper);
		border-color: transparent;
	}
	.row.done .input {
		background: transparent;
	}
	.check {
		display: grid;
		place-items: center;
		height: 38px;
		border: 1.5px solid var(--line-strong);
		border-radius: var(--radius-sm);
		background: var(--surface);
		color: var(--line-strong);
		cursor: pointer;
		transition:
			background-color 0.15s,
			color 0.15s,
			transform 0.1s;
	}
	.check:active {
		transform: scale(0.92);
	}
	.check[aria-pressed='true'] {
		background: var(--ok);
		border-color: var(--ok);
		color: var(--chrome);
	}
	.set-actions {
		display: flex;
		gap: 0.25rem;
		margin-top: 0.35rem;
	}
	footer {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem 0.75rem;
		margin-top: 0.65rem;
		padding-top: 0.55rem;
		border-top: 1px dashed var(--line);
	}
	.tools {
		display: flex;
		flex: 1;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.15rem 0.35rem;
		min-width: 0;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.35rem;
		min-height: 32px;
		padding: 0 0.45rem;
		border-radius: var(--radius-sm);
		background: var(--paper);
	}
	.chip span {
		font-size: 0.66rem;
		font-weight: 750;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--steel);
	}
	.chip input {
		width: 4.2rem;
		padding: 0;
		border: 0;
		background: transparent;
		color: var(--ink);
		font: inherit;
		font-size: 0.88rem;
		font-weight: 700;
	}
	.chip input:focus {
		outline: none;
	}
	.last-note {
		margin: 0.55rem 0 0;
		padding: 0.45rem 0.55rem;
		border-radius: var(--radius-sm);
		background: var(--paper-2);
		font-size: 0.85rem;
		color: var(--ink-2);
		line-height: 1.35;
	}
	.last-note .eyebrow {
		display: block;
		margin-bottom: 0.15rem;
	}
	.notes {
		display: grid;
		gap: 0.45rem;
	}
	.notes.open {
		margin-top: 0.65rem;
	}
	.note-actions {
		position: relative;
		justify-self: start;
	}
	.note-pick {
		position: absolute;
		left: 0;
		bottom: calc(100% + 0.25rem);
		z-index: 5;
		display: grid;
		min-width: 9.5rem;
		padding: 0.25rem;
		border: 1.5px solid var(--line-strong);
		border-radius: var(--radius-sm);
		background: var(--surface);
		box-shadow: var(--shadow);
	}
	.note-pick button {
		padding: 0.45rem 0.6rem;
		border: 0;
		border-radius: calc(var(--radius-sm) - 2px);
		background: transparent;
		color: var(--ink);
		font: inherit;
		font-size: 0.88rem;
		font-weight: 650;
		text-align: left;
		cursor: pointer;
	}
	.note-pick button:hover {
		background: var(--paper-2);
	}
	.add-note {
		display: inline-flex;
		align-items: center;
		gap: 0.3rem;
		padding: 0.35rem 0.55rem;
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--steel);
		font: inherit;
		font-size: 0.85rem;
		font-weight: 650;
		cursor: pointer;
	}
	.add-note:hover,
	.add-note[aria-expanded='true'] {
		color: var(--ink);
		background: var(--paper-2);
	}
	@keyframes sweep {
		from {
			background: linear-gradient(90deg, var(--ok) 0%, var(--done) 100%);
		}
	}
	@keyframes shake {
		25% {
			transform: translateX(-5px);
		}
		75% {
			transform: translateX(5px);
		}
	}
</style>
