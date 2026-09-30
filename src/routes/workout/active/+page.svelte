<script lang="ts">
	import { untrack } from 'svelte';
	import { goto, invalidateAll } from '$app/navigation';
	import Elapsed from '$lib/components/Elapsed.svelte';
	import ExerciseCard from '$lib/components/ExerciseCard.svelte';
	import ExerciseHistory from '$lib/components/ExerciseHistory.svelte';
	import ExercisePicker from '$lib/components/ExercisePicker.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Sheet from '$lib/components/Sheet.svelte';
	import { HIT_METHODS } from '$lib/hit';
	import type { Session, WorkoutExerciseState } from '$lib/types';
	import { formatDuration } from '$lib/units';
	import { WakeLock } from '$lib/wakelock.svelte';
	import { WorkoutSession } from '$lib/workout/session.svelte';

	let { data } = $props();

	const POLL_MS = 2500;

	const session = new WorkoutSession(untrack(() => data.workout), async (status, id) => {
		await invalidateAll();
		goto(status === 'completed' ? `/history/${id}?finished=1` : '/', { replaceState: true });
	});
	const wake = new WakeLock();

	const w = $derived(session.state);
	const unit = $derived(data.prefs?.weightUnit ?? 'kg');
	const defaultRest = $derived(data.prefs?.defaultRestSec ?? 90);

	let root: HTMLElement | undefined = $state();
	let picking = $state(false);
	let menuFor = $state<WorkoutExerciseState | null>(null);
	let hitFor = $state<WorkoutExerciseState | null>(null);
	let historyFor = $state<{ id: string; name: string } | null>(null);
	let history = $state<Session[] | null>(null);
	let finishing = $state(false);
	let renaming = $state(false);
	let restEditId = $state<string | null>(null);
	let customRest = $state('');

	const incomplete = $derived(
		w.exercises.reduce(
			(n, e) => n + e.sets.filter((s) => !s.completed).length + e.hits.reduce((m, h) => m + h.logs.filter((l) => !l.completed).length, 0),
			0
		)
	);
	const completedSets = $derived(w.exercises.reduce((n, e) => n + e.sets.filter((s) => s.completed).length, 0));
	const restEdit = $derived(w.exercises.find((e) => e.id === restEditId) ?? null);
	const restRunning = $derived(
		!!restEdit &&
			w.restWeId === restEdit.id &&
			!!w.restEndsAt &&
			new Date(w.restEndsAt).getTime() > Date.now() + session.offsetMs
	);

	function openRest(we: WorkoutExerciseState) {
		restEditId = we.id;
		customRest = '';
	}

	function saveRest(seconds: number | null) {
		if (!restEditId) return;
		session.send({ op: 'setRest', weId: restEditId, seconds });
		restEditId = null;
	}

	$effect(() => {
		wake.start();
		const tick = () => {
			if (document.visibilityState === 'visible' && session.canPoll(root)) session.refresh();
		};
		const t = setInterval(tick, POLL_MS);
		const onVis = () => document.visibilityState === 'visible' && session.refresh();
		document.addEventListener('visibilitychange', onVis);
		window.addEventListener('online', onVis);
		return () => {
			clearInterval(t);
			document.removeEventListener('visibilitychange', onVis);
			window.removeEventListener('online', onVis);
			wake.stop();
		};
	});

	async function openHistory(we: WorkoutExerciseState) {
		historyFor = { id: we.exerciseId, name: we.name };
		history = null;
		const res = await fetch(`/api/exercises/${we.exerciseId}/history`);
		if (res.ok) history = (await res.json()).sessions;
		else history = [];
	}

	function addExercise(ex: { id: string }) {
		picking = false;
		session.send({ op: 'addExercise', exerciseId: ex.id }).then(() => {
			requestAnimationFrame(() => root?.querySelector('.cards > li:last-child')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
		});
	}

	function addHit(methodKey: string) {
		if (!hitFor) return;
		session.send({ op: 'addHit', weId: hitFor.id, methodKey });
		hitFor = null;
	}
</script>

<svelte:head><title>{w.name} · Ironlog</title></svelte:head>

<div class="page workout" bind:this={root}>
	<div class="head">
		<div class="head-row">
			<div class="title">
				<button type="button" class="name" onclick={() => (renaming = true)}>{w.name}</button>
				<div class="sub">
					<span class="clock"><Icon name="timer" size={15} /><Elapsed since={w.startedAt} offsetMs={session.offsetMs} /></span>
					<span class="sync" class:busy={session.pending > 0} title="Syncs across your devices">
						{session.pending > 0 ? 'Saving…' : 'Synced'}
					</span>
					{#if wake.active}<span class="awake" title="Screen will stay on during this workout">Screen on</span>{/if}
				</div>
			</div>
			<button type="button" class="btn primary" onclick={() => (finishing = true)}>Finish</button>
		</div>
	</div>

	{#if session.error}
		<p class="form-error" role="alert">{session.error}</p>
	{/if}

	{#if w.exercises.length === 0}
		<div class="empty-state">
			<p>Empty workout. Add your first exercise to start logging.</p>
		</div>
	{/if}

	<ol class="cards">
		{#each w.exercises as we (we.id)}
			<li>
				<ExerciseCard
					{we}
					{unit}
					{session}
					exercises={data.exercises}
					restEndsAt={w.restWeId === we.id ? w.restEndsAt : null}
					restTotal={w.restWeId === we.id ? w.restTotalSec : null}
					offsetMs={session.offsetMs}
					idleSec={we.restSec ?? defaultRest}
					onhistory={() => openHistory(we)}
					onmenu={() => (menuFor = we)}
					onrest={() => openRest(we)}
				/>
			</li>
		{/each}
	</ol>

	<button type="button" class="btn dark block add-ex" onclick={() => (picking = true)}>
		<Icon name="plus" size={18} />Add exercises
	</button>
	<button
		type="button"
		class="btn danger block"
		onclick={() => {
			if (confirm('Discard this workout? Nothing will be saved.')) session.send({ op: 'discard' });
		}}
	>
		Discard workout
	</button>
</div>

<Sheet bind:open={picking} title="Add exercise">
	<ExercisePicker exercises={data.exercises} onpick={addExercise} />
</Sheet>

<Sheet open={!!menuFor} title={menuFor?.name ?? ''} onclose={() => (menuFor = null)}>
	{#if menuFor}
		{@const we = menuFor}
		{@const idx = w.exercises.findIndex((e) => e.id === we.id)}
		<div class="stack">
			<div class="two">
				<button class="btn" disabled={idx <= 0} onclick={() => session.send({ op: 'moveExercise', weId: we.id, dir: 'up' })}>
					<Icon name="up" size={18} />Move up
				</button>
				<button
					class="btn"
					disabled={idx >= w.exercises.length - 1}
					onclick={() => session.send({ op: 'moveExercise', weId: we.id, dir: 'down' })}
				>
					<Icon name="down" size={18} />Move down
				</button>
			</div>
			<button class="btn" onclick={() => { const target = we; menuFor = null; openHistory(target); }}>
				<Icon name="chart" size={18} />History & graphs
			</button>
			<button
				class="btn"
				onclick={() => {
					hitFor = we;
					menuFor = null;
				}}
			>
				<Icon name="bolt" size={18} />HIT method
			</button>
			<button
				class="btn danger"
				onclick={() => {
					if (confirm(`Remove ${we.name} from this workout?`)) {
						session.send({ op: 'removeExercise', weId: we.id });
						menuFor = null;
					}
				}}
			>
				<Icon name="trash" size={18} />Remove exercise
			</button>
		</div>
	{/if}
</Sheet>

<Sheet open={!!hitFor} title="Add HIT method" onclose={() => (hitFor = null)}>
	{#if hitFor}
		{@const used = hitFor.hits.map((h) => h.methodKey)}
		<p class="muted hint">Applied to <strong>{hitFor.name}</strong>. Log each drop, cluster or hold as its own entry.</p>
		<ul class="methods">
			{#each HIT_METHODS as m (m.key)}
				<li>
					<button type="button" style:--c={m.color} disabled={used.includes(m.key)} onclick={() => addHit(m.key)}>
						<span class="swatch"></span>
						<span class="m-text">
							<strong>{m.name}{used.includes(m.key) ? ' · added' : ''}</strong>
							<span>{m.description}</span>
						</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
</Sheet>

<Sheet open={!!historyFor} title={historyFor?.name ?? ''} onclose={() => (historyFor = null)}>
	{#if history === null}
		<p class="empty">Loading history…</p>
	{:else}
		<ExerciseHistory sessions={history} {unit} linkWorkouts={false} />
	{/if}
</Sheet>

<Sheet bind:open={renaming} title="Workout details">
	<div class="stack">
		<label class="field">
			Name
			<input
				value={w.name}
				maxlength="80"
				onchange={(e) => {
					const name = e.currentTarget.value.trim();
					if (name) session.send({ op: 'rename', name, notes: w.notes });
				}}
			/>
		</label>
		<label class="field">
			Workout notes
			<textarea
				rows="4"
				value={w.notes ?? ''}
				onchange={(e) => session.send({ op: 'rename', name: w.name, notes: e.currentTarget.value })}
			></textarea>
		</label>
		<button class="btn primary block" onclick={() => (renaming = false)}>Done</button>
	</div>
</Sheet>

<Sheet open={!!restEdit} title={restEdit ? `${restEdit.name} rest` : 'Rest'} onclose={() => (restEditId = null)}>
	{#if restEdit}
		<div class="timers">
			{#each [30, 45, 60, 90, 120, 180] as s (s)}
				<button
					class="btn"
					class:primary={s === (restEdit.restSec ?? defaultRest)}
					onclick={() => saveRest(s)}
				>
					{formatDuration(s)}
				</button>
			{/each}
		</div>
		<form
			class="custom-rest"
			onsubmit={(e) => {
				e.preventDefault();
				const n = Math.round(Number(customRest));
				if (Number.isFinite(n)) saveRest(Math.max(0, Math.min(900, n)));
			}}
		>
			<label class="field">
				Seconds
				<input name="seconds" type="number" inputmode="numeric" min="0" max="900" bind:value={customRest} />
			</label>
			<button class="btn" type="submit" disabled={customRest.trim() === ''}>Set</button>
		</form>
		{#if restEdit.restSec != null}
			<button class="btn block" onclick={() => saveRest(null)}>Use default ({formatDuration(defaultRest)})</button>
		{/if}
		{#if restRunning}
			<div class="two">
				<button class="btn" onclick={() => session.send({ op: 'adjustRest', delta: -15 })}>−15s</button>
				<button class="btn" onclick={() => session.send({ op: 'adjustRest', delta: 15 })}>+15s</button>
			</div>
			<button class="btn danger block" onclick={() => { session.send({ op: 'stopRest' }); restEditId = null; }}>Skip rest</button>
		{:else if (restEdit.restSec ?? defaultRest) > 0}
			<button
				class="btn primary block"
				onclick={() => {
					session.send({ op: 'startRest', weId: restEdit.id, seconds: restEdit.restSec ?? defaultRest });
					restEditId = null;
				}}
			>
				Start
			</button>
		{/if}
	{/if}
</Sheet>

<Sheet bind:open={finishing} title="Finish workout?">
	<div class="stack">
		<p>
			<strong class="num">{completedSets}</strong> sets completed across
			<strong class="num">{w.exercises.length}</strong> exercises.
		</p>
		{#if incomplete > 0}
			<p class="form-error">{incomplete} unticked {incomplete === 1 ? 'entry' : 'entries'} will be discarded.</p>
		{/if}
		{#if w.exercises.some((e) => e.rating == null)}
			<p class="muted">Tip: rate each exercise before finishing so it shows in your history.</p>
		{/if}
		<button
			class="btn primary block"
			disabled={completedSets === 0 && !w.exercises.some((e) => e.hits.some((h) => h.logs.some((l) => l.completed)))}
			onclick={() => {
				finishing = false;
				session.send({ op: 'finish' });
			}}
		>
			Finish & save
		</button>
		<button class="btn ghost block" onclick={() => (finishing = false)}>Keep going</button>
	</div>
</Sheet>

<style>
	.workout {
		padding-top: 0;
	}
	.head {
		position: sticky;
		top: calc(58px + env(safe-area-inset-top));
		z-index: 15;
		display: grid;
		gap: 0.6rem;
		margin: 0 -1rem;
		padding: 0.7rem 1rem;
		background: var(--topbar);
		backdrop-filter: blur(10px);
		border-bottom: 1px solid var(--line);
	}
	.head-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.title {
		flex: 1;
		min-width: 0;
	}
	.name {
		display: block;
		max-width: 100%;
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		font-size: 1.35rem;
		font-weight: 850;
		font-stretch: 118%;
		text-align: left;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		cursor: pointer;
	}
	.sub {
		display: flex;
		align-items: center;
		gap: 0.6rem;
		font-size: 0.8rem;
		color: var(--steel);
	}
	.clock {
		display: inline-flex;
		align-items: center;
		gap: 0.2rem;
		font-weight: 750;
		color: var(--ink);
	}
	.sync::before,
	.awake::before {
		content: '';
		display: inline-block;
		width: 7px;
		height: 7px;
		margin-right: 0.3rem;
		border-radius: 50%;
		background: var(--lime-deep);
	}
	.sync.busy::before {
		background: #ffb224;
	}
	.awake::before {
		background: #0090ff;
	}
	.cards {
		display: grid;
		gap: 0.9rem;
		margin: 0.75rem 0 1rem;
		padding: 0;
		list-style: none;
	}
	.cards > li {
		scroll-margin-top: 120px;
	}
	.empty-state {
		margin: 2rem 0 1rem;
		padding: 2rem 1rem;
		border: 1.5px dashed var(--line-strong);
		border-radius: var(--radius);
		text-align: center;
		color: var(--steel);
	}
	.add-ex {
		margin-bottom: 0.75rem;
		min-height: 52px;
	}
	.two {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
	}
	.hint {
		margin-bottom: 0.75rem;
		font-size: 0.88rem;
	}
	.methods {
		display: grid;
		gap: 0.5rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}
	.methods button {
		display: flex;
		align-items: stretch;
		gap: 0.75rem;
		width: 100%;
		padding: 0.6rem;
		border: 1.5px solid var(--line);
		border-radius: var(--radius-sm);
		background: color-mix(in srgb, var(--c) 6%, var(--surface));
		text-align: left;
		font: inherit;
		cursor: pointer;
	}
	.methods button:hover:not(:disabled) {
		border-color: var(--c);
	}
	.methods button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	.swatch {
		flex: none;
		width: 8px;
		border-radius: 4px;
		background: var(--c);
	}
	.m-text {
		display: grid;
		gap: 0.15rem;
	}
	.m-text span {
		font-size: 0.82rem;
		color: var(--ink-2);
	}
	.timers {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}
	.custom-rest {
		display: flex;
		align-items: end;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}
	.custom-rest .field {
		flex: 1;
	}
</style>
