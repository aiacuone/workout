<script lang="ts">
	import { hitMethod, type HitField } from '$lib/hit';
	import type { HitLogView, HitView } from '$lib/types';
	import { selectAll } from '$lib/select-all';
	import { displayToKg, kgToDisplay, type WeightUnit } from '$lib/units';
	import type { WorkoutSession } from '$lib/workout/session.svelte';
	import HitBadge from './HitBadge.svelte';
	import HoldTimer from './HoldTimer.svelte';
	import Icon from './Icon.svelte';

	let {
		hit,
		prev,
		unit,
		exercises,
		session
	}: {
		hit: HitView;
		prev: HitView | null;
		unit: WeightUnit;
		exercises: { id: string; name: string }[];
		session: WorkoutSession;
	} = $props();

	const m = $derived(hitMethod(hit.methodKey));
	let showInfo = $state(false);

	const FIELD_LABEL = $derived<Record<HitField, string>>({
		weight: unit,
		reps: 'reps',
		duration: hit.methodKey === 'negatives' ? 'sec/rep' : 'sec',
		rest: 'rest s',
		exercise: 'exercise'
	});

	function update(log: HitLogView, patch: Partial<HitLogView>) {
		Object.assign(log, patch);
		session.send({ op: 'updateHitLog', logId: log.id, patch });
	}

	function intOrNull(v: string) {
		if (v.trim() === '') return null;
		const n = Math.round(Number(v));
		return Number.isFinite(n) && n >= 0 ? n : null;
	}

	function toggle(log: HitLogView, i: number) {
		if (log.completed) return update(log, { completed: false });
		const p = prev?.logs[i];
		const patch: Partial<HitLogView> = { completed: true };
		if (m.fields.includes('weight') && log.weightKg == null && p?.weightKg != null) patch.weightKg = p.weightKg;
		if (m.fields.includes('reps') && log.reps == null && p?.reps != null) patch.reps = p.reps;
		if (m.fields.includes('duration') && log.durationSec == null && p?.durationSec != null)
			patch.durationSec = p.durationSec;
		if (m.fields.includes('exercise') && !log.data?.exerciseId && p?.data?.exerciseId) patch.data = p.data;
		update(log, patch);
	}
</script>

<section class="hit" style:--c={m.color}>
	<header>
		<HitBadge method={hit.methodKey} />
		<span class="name">{m.name}</span>
		<button type="button" class="icon-btn sm" aria-label="About {m.name}" onclick={() => (showInfo = !showInfo)}>?</button>
		<button
			type="button"
			class="icon-btn sm"
			aria-label="Remove {m.name}"
			onclick={() => {
				if (confirm(`Remove ${m.name} from this exercise?`)) session.send({ op: 'removeHit', hitId: hit.id });
			}}
		>
			<Icon name="x" size={16} />
		</button>
	</header>
	{#if showInfo}<p class="info">{m.description}</p>{/if}

	<div class="rows">
		{#each hit.logs as log, i (log.id)}
			{@const p = prev?.logs[i]}
			<div class="entry" class:done={log.completed}>
				<span class="lbl">{m.entryLabel} {i + 1}</span>
				<div class="fields" style:--n={m.fields.length}>
					{#each m.fields as f (f)}
						<label class="f" class:wide={f === 'exercise'}>
							{#if f === 'weight'}
								<input
									class="input"
									inputmode="decimal"
									placeholder={kgToDisplay(p?.weightKg, unit) || '–'}
									value={kgToDisplay(log.weightKg, unit)}
									onfocus={selectAll}
									onpointerup={selectAll}
									onchange={(e) => update(log, { weightKg: displayToKg(e.currentTarget.value, unit) })}
								/>
							{:else if f === 'reps'}
								<input
									class="input"
									inputmode="numeric"
									placeholder={p?.reps?.toString() ?? '–'}
									value={log.reps ?? ''}
									onfocus={selectAll}
									onpointerup={selectAll}
									onchange={(e) => update(log, { reps: intOrNull(e.currentTarget.value) })}
								/>
							{:else if f === 'duration'}
								<input
									class="input"
									inputmode="numeric"
									placeholder={p?.durationSec?.toString() ?? '–'}
									value={log.durationSec ?? ''}
									onchange={(e) => update(log, { durationSec: intOrNull(e.currentTarget.value) })}
								/>
							{:else if f === 'rest'}
								<input
									class="input"
									inputmode="numeric"
									placeholder={p?.restSec?.toString() ?? '–'}
									value={log.restSec ?? ''}
									onchange={(e) => update(log, { restSec: intOrNull(e.currentTarget.value) })}
								/>
							{:else if f === 'exercise'}
								<select
									class="input"
									value={log.data?.exerciseId ?? ''}
									onchange={(e) => {
										const ex = exercises.find((x) => x.id === e.currentTarget.value);
										update(log, { data: ex ? { exerciseId: ex.id, exerciseName: ex.name } : {} });
									}}
								>
									<option value="">{p?.data?.exerciseName ?? 'Isolation exercise…'}</option>
									{#each exercises as ex (ex.id)}<option value={ex.id}>{ex.name}</option>{/each}
								</select>
							{/if}
							<span class="unit">{FIELD_LABEL[f]}</span>
						</label>
					{/each}
				</div>
				<div class="actions">
					{#if hit.methodKey === 'isometric' && !log.completed}
						<HoldTimer color={m.color} onstop={(s) => update(log, { durationSec: s })} />
					{/if}
					<button
						type="button"
						class="check"
						aria-label={log.completed ? 'Mark not done' : 'Mark done'}
						aria-pressed={log.completed}
						onclick={() => toggle(log, i)}
					>
						<Icon name="check" size={16} />
					</button>
					<button
						type="button"
						class="del"
						aria-label="Delete entry"
						onclick={() => session.send({ op: 'removeHitLog', logId: log.id })}
					>
						<Icon name="trash" size={15} />
					</button>
				</div>
			</div>
		{/each}
	</div>

	<button type="button" class="add" onclick={() => session.send({ op: 'addHitLog', hitId: hit.id })}>
		<Icon name="plus" size={16} />Add {m.entryLabel.toLowerCase()}
	</button>
</section>

<style>
	.hit {
		margin-top: 0.45rem;
		border-left: 3px solid color-mix(in srgb, var(--c) 50%, var(--line-strong));
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		background: color-mix(in srgb, var(--c) 5%, var(--surface));
		padding: 0.35rem 0.35rem 0.25rem 0.5rem;
	}
	header {
		display: flex;
		align-items: center;
		gap: 0.35rem;
	}
	.name {
		flex: 1;
		font-weight: 800;
		font-size: 0.92rem;
	}
	.icon-btn.sm {
		width: 28px;
		height: 28px;
		font-weight: 800;
	}
	.info {
		margin: 0.3rem 0 0.2rem;
		font-size: 0.83rem;
		color: var(--ink-2);
	}
	.rows {
		display: grid;
		gap: 0.05rem;
		margin-top: 0.2rem;
	}
	.entry {
		display: grid;
		grid-template-columns: max-content minmax(0, 1fr) auto;
		align-items: center;
		gap: 0.3rem;
		padding: 0.02rem 0;
		border-radius: var(--radius-sm);
		transition: background-color 0.2s;
	}
	.entry.done {
		background: color-mix(in srgb, var(--c) 10%, transparent);
	}
	.lbl {
		font-size: 0.75rem;
		font-weight: 800;
		color: color-mix(in srgb, var(--c) 65%, var(--ink-2));
	}
	.fields {
		display: grid;
		grid-template-columns: repeat(var(--n), minmax(0, 1fr));
		gap: 0.25rem;
	}
	.f {
		position: relative;
		display: block;
	}
	.f.wide {
		grid-column: span 1;
	}
	.f .input {
		min-height: 32px;
		padding: 0.05rem 0.15rem 0.65rem;
		text-align: center;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		background: transparent;
		border-color: transparent;
		box-shadow: none;
	}
	.f .input:focus {
		border-color: var(--lime);
		box-shadow: none;
	}
	.f select.input {
		padding: 0.05rem 0.15rem 0.65rem;
		text-align: left;
		font-size: 0.8rem;
	}
	.unit {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 2px;
		text-align: center;
		font-size: 0.6rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		color: var(--steel);
		pointer-events: none;
	}
	.actions {
		display: flex;
		align-items: center;
		gap: 0.2rem;
	}
	.check,
	.del {
		display: grid;
		place-items: center;
		width: 32px;
		height: 32px;
		padding: 0;
		border-radius: var(--radius-sm);
		cursor: pointer;
	}
	.check {
		border: 1.5px solid color-mix(in srgb, var(--c) 40%, var(--line-strong));
		border-radius: var(--radius-sm);
		background: var(--surface);
		color: color-mix(in srgb, var(--c) 65%, var(--ink-2));
		cursor: pointer;
	}
	.check[aria-pressed='true'] {
		border-color: color-mix(in srgb, var(--c) 55%, var(--line-strong));
		background: color-mix(in srgb, var(--c) 55%, var(--line-strong));
		color: var(--ink);
	}
	.del {
		border: 0;
		background: transparent;
		color: var(--steel);
	}
	.del:hover {
		background: var(--paper-2);
		color: var(--ink);
	}
	.add {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		margin-top: 0.15rem;
		padding: 0.2rem 0.35rem;
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--ink-2);
		font: inherit;
		font-size: 0.85rem;
		font-weight: 750;
		cursor: pointer;
	}
	.add:hover {
		background: color-mix(in srgb, var(--c) 8%, transparent);
	}
	@media (max-width: 420px) {
		.entry {
			grid-template-columns: minmax(0, 1fr) auto;
		}
		.lbl {
			grid-column: 1 / -1;
		}
	}
</style>
