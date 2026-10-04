<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import ExerciseHistory from '$lib/components/ExerciseHistory.svelte';
	import HitBadge from '$lib/components/HitBadge.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Rating from '$lib/components/Rating.svelte';
	import HistorySessionNote from '$lib/components/HistorySessionNote.svelte';
	import Sheet from '$lib/components/Sheet.svelte';
	import { hitLogSummary, setSummary } from '$lib/format';
	import { hitMethod } from '$lib/hit';
	import TrendMarks from '$lib/components/Trend.svelte';
	import { RECORD_LABEL, recordDetail, recordsHeadline } from '$lib/records';
	import type { Session } from '$lib/types';
	import { formatDate, formatDuration, kgToDisplay } from '$lib/units';

	let { data } = $props();

	const w = $derived(data.workout);
	const unit = $derived(data.prefs?.weightUnit ?? 'kg');
	const finished = $derived(page.url.searchParams.has('finished'));
	const duration = $derived(
		w.finishedAt ? (new Date(w.finishedAt).getTime() - new Date(w.startedAt).getTime()) / 1000 : null
	);
	const recordGroups = $derived.by(() => {
		const groups: { id: string; name: string; bits: string[] }[] = [];
		for (const record of data.records) {
			const bit = `${RECORD_LABEL[record.kind]} ${recordDetail(record, unit)}`.trim();
			const group = groups.find((g) => g.id === record.exerciseId);
			if (group) group.bits.push(bit);
			else groups.push({ id: record.exerciseId, name: record.exerciseName, bits: [bit] });
		}
		return groups;
	});

	let historyFor = $state<{ id: string; name: string } | null>(null);
	let history = $state<Session[] | null>(null);
	let rateForm: HTMLFormElement | undefined = $state();
	let rateWe = $state('');
	let rateVal = $state('');
	let noteForm: HTMLFormElement | undefined = $state();
	let noteWe = $state('');
	let noteVal = $state('');

	async function openHistory(exerciseId: string, name: string) {
		historyFor = { id: exerciseId, name };
		history = null;
		const res = await fetch(`/api/exercises/${exerciseId}/history`);
		history = res.ok ? (await res.json()).sessions : [];
	}

	function rate(weId: string, v: number | null) {
		rateWe = weId;
		rateVal = v == null ? '' : String(v);
		queueMicrotask(() => rateForm?.requestSubmit());
	}

	function note(weId: string, raw: string) {
		const ex = w.exercises.find((e) => e.id === weId);
		const notes = raw.trim() || null;
		if (ex) ex.notes = notes;
		noteWe = weId;
		noteVal = notes ?? '';
		queueMicrotask(() => noteForm?.requestSubmit());
	}
</script>

<svelte:head><title>{w.name} · Strongr</title></svelte:head>

<div class="page">
	<a class="back" href="/history"><Icon name="back" size={18} />History</a>

	{#if finished}
		<div class="saved">
			<strong>Workout complete</strong>
			<span>{recordsHeadline(data.records.length)}</span>
			{#if recordGroups.length}
				<ul>
					{#each recordGroups as group (group.id)}
						<li><b>{group.name}</b> · {group.bits.join(' · ')}</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}

	<div class="page-head">
		<div>
			<p class="eyebrow">{formatDate(w.startedAt, { year: 'numeric' })} · {new Date(w.startedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</p>
			<h1>{w.name}</h1>
		</div>
	</div>

	<div class="totals">
		<div><span class="eyebrow">Time</span><strong class="num">{duration ? formatDuration(duration) : '—'}</strong></div>
		<div><span class="eyebrow">Volume</span><strong class="num">{Number(kgToDisplay(data.totals.volumeKg, unit)).toLocaleString()}<small>{unit}</small></strong></div>
		<div><span class="eyebrow">Sets</span><strong class="num">{data.totals.sets}</strong></div>
		<div><span class="eyebrow">Reps</span><strong class="num">{data.totals.reps}</strong></div>
		<div><span class="eyebrow">Records</span><strong class="num">{data.records.length}</strong></div>
	</div>

	{#if !finished && recordGroups.length}
		<ul class="prs">
			{#each recordGroups as group (group.id)}
				<li><b>{group.name}</b> · {group.bits.join(' · ')}</li>
			{/each}
		</ul>
	{/if}

	{#if w.notes}<p class="notes">{w.notes}</p>{/if}

	<ol class="exercises">
		{#each w.exercises as e (e.id)}
			<li>
				<button type="button" class="ex-title" onclick={() => openHistory(e.exerciseId, e.name)}>
					<span class="ex-name">
						{e.name}
						<TrendMarks volume={data.trends[e.id]?.volume ?? null} weight={data.trends[e.id]?.weight ?? null} />
					</span>
					<Icon name="chart" size={18} />
				</button>
				{#if e.repRange || e.cableHeight || e.seatHeight}
					<p class="extras">
						{#if e.repRange}<span>Reps {e.repRange}</span>{/if}
						{#if e.cableHeight}<span>Weight height {e.cableHeight}</span>{/if}
						{#if e.seatHeight}<span>Seat {e.seatHeight}</span>{/if}
					</p>
				{/if}
				<ul class="sets">
					{#each e.sets as s, i (s.id)}
						<li>
							<span class="idx">{s.type === 'warmup' ? 'W' : s.type === 'failure' ? 'F' : i + 1 - e.sets.slice(0, i).filter((x) => x.type === 'warmup').length}</span>
							<span class="num">{setSummary(s, unit)}</span>
						</li>
					{/each}
				</ul>
				{#each e.hits as h (h.id)}
					<div class="hit" style:--c={hitMethod(h.methodKey).color}>
						<HitBadge method={h.methodKey} full />
						<ol>
							{#each h.logs as l, i (l.id)}
								<li class="num"><span>{hitMethod(h.methodKey).entryLabel} {i + 1}</span>{hitLogSummary(h.methodKey, l, unit)}</li>
							{/each}
						</ol>
					</div>
				{/each}
				<HistorySessionNote value={e.notes} onchange={(notes) => note(e.id, notes ?? '')} />
				<div class="rate"><Rating value={e.rating} onchange={(v) => rate(e.id, v)} /></div>
			</li>
		{/each}
	</ol>

	<div class="actions">
		<form method="POST" action="?/saveRoutine">
			<button class="btn block"><Icon name="list" size={18} />Save as routine</button>
		</form>
		<form method="POST" action="?/delete">
			<button
				class="btn danger block"
				onclick={(ev) => {
					if (!confirm('Delete this workout permanently?')) ev.preventDefault();
				}}
			>
				<Icon name="trash" size={18} />Delete workout
			</button>
		</form>
	</div>
</div>

<form method="POST" action="?/rate" bind:this={rateForm} use:enhance={() => async ({ update }) => update({ reset: false })} hidden>
	<input type="hidden" name="weId" value={rateWe} />
	<input type="hidden" name="rating" value={rateVal} />
</form>

<form method="POST" action="?/note" bind:this={noteForm} use:enhance={() => async ({ update }) => update({ reset: false })} hidden>
	<input type="hidden" name="weId" value={noteWe} />
	<input type="hidden" name="notes" value={noteVal} />
</form>

<Sheet open={!!historyFor} title={historyFor?.name ?? ''} onclose={() => (historyFor = null)}>
	{#if history === null}
		<p class="empty">Loading history…</p>
	{:else}
		<ExerciseHistory sessions={history} {unit} />
		{#if historyFor}
			<a class="btn block full" href="/exercises/{historyFor.id}?from=/history/{w.id}">Open exercise page</a>
		{/if}
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
	.saved {
		display: grid;
		margin-bottom: 1rem;
		padding: 0.8rem 1rem;
		border: 1.5px solid var(--lime);
		border-radius: var(--radius);
		background: var(--lime);
		color: var(--on-lime);
		animation: pop 0.5s var(--ease);
	}
	.saved span {
		font-size: 0.95rem;
		font-weight: 700;
	}
	.saved ul,
	.prs {
		margin: 0.45rem 0 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.2rem;
		font-size: 0.86rem;
		font-weight: 650;
	}
	.prs {
		margin: -0.35rem 0 1rem;
		color: var(--ink-2);
	}
	.prs b,
	.saved b {
		font-weight: 800;
		color: inherit;
	}
	.totals {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: 1px;
		margin-bottom: 1rem;
		border: 1.5px solid var(--ink);
		border-radius: var(--radius);
		background: var(--ink);
		overflow: hidden;
	}
	.totals div {
		display: grid;
		padding: 0.55rem 0.7rem;
		background: var(--surface);
	}
	.totals strong {
		font-size: 1.2rem;
		font-weight: 800;
		font-stretch: 115%;
	}
	.totals small {
		margin-left: 2px;
		font-size: 0.7rem;
		color: var(--steel);
	}
	.notes {
		margin-bottom: 1rem;
		color: var(--ink-2);
	}
	.exercises {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.75rem;
	}
	.exercises > li {
		padding: 0.85rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.ex-title {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.5rem;
		width: 100%;
		padding: 0;
		border: 0;
		background: none;
		font: inherit;
		font-size: 1.08rem;
		font-weight: 850;
		font-stretch: 112%;
		color: var(--link);
		text-align: left;
		cursor: pointer;
	}
	.ex-name {
		display: inline-flex;
		align-items: center;
		gap: 0.4rem;
		min-width: 0;
	}
	.extras {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin: 0.35rem 0;
	}
	.extras span {
		padding: 0.1rem 0.45rem;
		border-radius: 4px;
		background: var(--paper-2);
		font-size: 0.78rem;
		font-weight: 650;
	}
	.sets {
		margin: 0.4rem 0 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.15rem;
	}
	.sets li {
		display: flex;
		gap: 0.7rem;
	}
	.idx {
		width: 1.2rem;
		font-weight: 800;
		color: var(--steel);
	}
	.hit {
		margin-top: 0.6rem;
		padding: 0.45rem 0.6rem;
		border-left: 4px solid var(--c);
		background: color-mix(in srgb, var(--c) 7%, transparent);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
	}
	.hit ol {
		margin: 0.35rem 0 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.1rem;
		font-size: 0.9rem;
	}
	.hit li span {
		display: inline-block;
		min-width: 5.5rem;
		font-size: 0.78rem;
		font-weight: 750;
		color: var(--ink-2);
	}
	.note {
		margin-top: 0.4rem;
		font-size: 0.88rem;
		font-style: italic;
		color: var(--ink-2);
	}
	.rate {
		margin-top: 0.6rem;
		padding-top: 0.5rem;
		border-top: 1px dashed var(--line);
	}
	.actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		margin-top: 1.5rem;
	}
	.full {
		margin-top: 1rem;
	}
	@keyframes pop {
		from {
			transform: scale(0.96);
			opacity: 0;
		}
	}
	@media (max-width: 480px) {
		.totals {
			grid-template-columns: repeat(3, 1fr);
		}
		.actions {
			grid-template-columns: 1fr;
		}
	}
</style>
