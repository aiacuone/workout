<script lang="ts">
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import ExercisePicker from '$lib/components/ExercisePicker.svelte';
	import ExerciseSetup from '$lib/components/ExerciseSetup.svelte';
	import HistorySessionNote from '$lib/components/HistorySessionNote.svelte';
	import HitBadge from '$lib/components/HitBadge.svelte';
	import Icon from '$lib/components/Icon.svelte';
	import Sheet from '$lib/components/Sheet.svelte';
	import { HIT_METHODS, hitMethod } from '$lib/hit';
	import { parseRepRange } from '$lib/rep-range';
	import { kgToDisplay } from '$lib/units';

	let { data } = $props();

	let picking = $state(false);
	let confirmingDelete = $state(false);
	let hitFor = $state<string | null>(null);
	let hitReplace = $state<string | null>(null);
	let openHit = $state<string | null>(null);
	let hitOverrides = $state<Record<string, string[]>>({});
	let addForm: HTMLFormElement | undefined = $state();
	let addId = $state('');
	let hitForm: HTMLFormElement | undefined = $state();
	let hitItemId = $state('');
	let hitMethodKey = $state('');
	let hitFromKey = $state('');
	let removeHitForm: HTMLFormElement | undefined = $state();
	let removeHitItemId = $state('');
	let removeHitKey = $state('');
	let setupForm: HTMLFormElement | undefined = $state();
	let setupItem = $state('');
	let setupHeight = $state('');
	let setupSeat = $state('');
	let setupSupport = $state('');
	let noteForm: HTMLFormElement | undefined = $state();
	let noteExercise = $state('');
	let noteVal = $state('');
	let savedNotes = $state<Record<string, string | null>>({});

	const unit = $derived(data.prefs?.weightUnit ?? 'kg');

	const hitItem = $derived(data.items.find((it) => it.id === hitFor) ?? null);

	function pick(ex: { id: string }) {
		addId = ex.id;
		picking = false;
		queueMicrotask(() => addForm?.requestSubmit());
	}

	function methodsOf(item: { id: string; hitMethods: string[] }) {
		return hitOverrides[item.id] ?? item.hitMethods;
	}

	function hitMenuId(itemId: string, methodKey: string) {
		return `${itemId}:${methodKey}`;
	}

	$effect(() => {
		if (!openHit) return;
		const close = (e: PointerEvent) => {
			const target = e.target;
			if (target instanceof Element && target.closest('[data-hit-menu]')) return;
			openHit = null;
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape') openHit = null;
		};
		document.addEventListener('pointerdown', close);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('pointerdown', close);
			document.removeEventListener('keydown', onKey);
		};
	});

	function closeHitSheet() {
		hitFor = null;
		hitReplace = null;
	}

	function addHit(methodKey: string) {
		const item = data.items.find((it) => it.id === hitFor);
		if (!item) return;
		const current = methodsOf(item);
		const from = hitReplace;
		if (from) {
			if (from === methodKey || !current.includes(from)) return;
			hitOverrides[item.id] = current.includes(methodKey)
				? current.filter((key) => key !== from)
				: current.map((key) => (key === from ? methodKey : key));
		} else {
			if (current.includes(methodKey)) return;
			hitOverrides[item.id] = [...current, methodKey];
		}
		hitItemId = item.id;
		hitMethodKey = methodKey;
		hitFromKey = from ?? '';
		closeHitSheet();
		queueMicrotask(() => hitForm?.requestSubmit());
	}

	function removeHit(itemId: string, methodKey: string) {
		const item = data.items.find((it) => it.id === itemId);
		if (!item) return;
		hitOverrides[itemId] = methodsOf(item).filter((key) => key !== methodKey);
		removeHitItemId = itemId;
		removeHitKey = methodKey;
		queueMicrotask(() => removeHitForm?.requestSubmit());
	}

	const autosave =
		() =>
		async ({
			update
		}: {
			update: (o?: { reset?: boolean; invalidateAll?: boolean }) => Promise<void>;
		}) =>
			update({ reset: false, invalidateAll: false });

	const saveHit =
		() =>
		async ({
			update
		}: {
			update: (o?: { reset?: boolean; invalidateAll?: boolean }) => Promise<void>;
		}) => {
			await update({ reset: false, invalidateAll: true });
			hitOverrides = {};
		};

	async function saveSetup(
		itemId: string,
		patch: { cableHeight?: string | null; seatHeight?: string | null; support?: string | null }
	) {
		const item = data.items.find((it) => it.id === itemId);
		if (!item) return;
		Object.assign(item, patch);
		setupItem = itemId;
		setupHeight = item.cableHeight ?? '';
		setupSeat = item.seatHeight ?? '';
		setupSupport = item.support ?? '';
		await tick();
		setupForm?.requestSubmit();
	}

	function exerciseNote(exerciseId: string, stored: string | null) {
		return Object.hasOwn(savedNotes, exerciseId) ? savedNotes[exerciseId] : stored;
	}

	async function savePermanent(exerciseId: string, notes: string | null) {
		savedNotes[exerciseId] = notes;
		noteExercise = exerciseId;
		noteVal = notes ?? '';
		await tick();
		noteForm?.requestSubmit();
	}

	function saveTargets(e: FocusEvent) {
		const form = e.currentTarget;
		if (!(form instanceof HTMLFormElement)) return;
		const next = e.relatedTarget;
		if (next instanceof Node && form.contains(next)) return;
		form.requestSubmit();
	}
</script>

<svelte:head><title>{data.routine.name} · Strongr</title></svelte:head>

<div class="page">
	<a class="back" href="/routines"><Icon name="back" size={18} />Routines</a>
	<div class="page-head">
		<div class="title-block">
			<p class="eyebrow">Routine · {data.items.length} exercises</p>
			<form method="POST" action="?/rename" use:enhance={autosave}>
				<input
					class="title-input"
					name="name"
					aria-label="Routine name"
					required
					maxlength="80"
					value={data.routine.name}
					onchange={(e) => e.currentTarget.form?.requestSubmit()}
				/>
			</form>
		</div>
	</div>
	<form method="POST" action="?/notes" class="notes" use:enhance={autosave}>
		<label class="field">
			Routine note
			<textarea name="notes" rows="3" onchange={(e) => e.currentTarget.form?.requestSubmit()}
				>{data.routine.notes ?? ''}</textarea
			>
		</label>
	</form>

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
			{@const reps = parseRepRange(item.repRange)}
			{@const methods = methodsOf(item)}
			{@const hitColor = methods[0] ? hitMethod(methods[0]).color : null}
			<li class:hit={hitColor != null} style:--c={hitColor}>
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
				<form
					method="POST"
					action="?/updateItem"
					use:enhance={autosave}
					class="targets"
					onfocusout={saveTargets}
				>
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
						/>
					</label>
					<label class="field">
						Rep range
						<span class="rep-pair">
							<input
								name="repMin"
								type="text"
								inputmode="numeric"
								autocomplete="off"
								aria-label="Minimum reps"
								placeholder="8"
								value={reps.min}
							/>
							<span class="rep-dash" aria-hidden="true">–</span>
							<input
								name="repMax"
								type="text"
								inputmode="numeric"
								autocomplete="off"
								aria-label="Maximum reps"
								placeholder="12"
								value={reps.max}
							/>
						</span>
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
						/>
					</label>
				</form>
				<ExerciseSetup
					cableHeight={item.cableHeight}
					seatHeight={item.seatHeight}
					support={item.support}
					onchange={(patch) => saveSetup(item.id, patch)}
				/>
				<div class="hits">
					{#each methods as key (key)}
						{@const menuId = hitMenuId(item.id, key)}
						{@const menuOpen = openHit === menuId}
						<div class="hit-chip" data-hit-menu>
							<button
								type="button"
								class="hit-badge"
								aria-label="{hitMethod(key).name} options"
								aria-expanded={menuOpen}
								aria-haspopup="menu"
								onclick={() => (openHit = menuOpen ? null : menuId)}
							>
								<HitBadge method={key} full />
							</button>
							{#if menuOpen}
								<div class="hit-menu" role="menu">
									<button
										type="button"
										role="menuitem"
										onclick={() => {
											openHit = null;
											hitReplace = key;
											hitFor = item.id;
										}}
									>
										Change
									</button>
									<button
										type="button"
										role="menuitem"
										class="remove"
										onclick={() => {
											openHit = null;
											removeHit(item.id, key);
										}}
									>
										Remove
									</button>
								</div>
							{/if}
						</div>
					{:else}
						<button
							type="button"
							class="btn sm"
							onclick={() => {
								hitReplace = null;
								hitFor = item.id;
							}}
						>
							<Icon name="bolt" size={16} />HIT
						</button>
					{/each}
				</div>
				<HistorySessionNote
					value={exerciseNote(item.exerciseId, item.exerciseNotes)}
					label="Permanent note"
					placeholder="Form cues, setup, keep forever…"
					addLabel="Permanent note"
					onchange={(notes) => savePermanent(item.exerciseId, notes)}
				/>
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

<form method="POST" action="?/addHit" use:enhance={saveHit} bind:this={hitForm} hidden>
	<input type="hidden" name="itemId" value={hitItemId} />
	<input type="hidden" name="methodKey" value={hitMethodKey} />
	<input type="hidden" name="fromKey" value={hitFromKey} />
</form>

<form method="POST" action="?/removeHit" use:enhance={saveHit} bind:this={removeHitForm} hidden>
	<input type="hidden" name="itemId" value={removeHitItemId} />
	<input type="hidden" name="methodKey" value={removeHitKey} />
</form>

<form
	method="POST"
	action="?/permanentNote"
	bind:this={noteForm}
	use:enhance={() => async ({ update }) => update({ reset: false, invalidateAll: false })}
	hidden
>
	<input type="hidden" name="exerciseId" value={noteExercise} />
	<input type="hidden" name="notes" value={noteVal} />
</form>

<form
	method="POST"
	action="?/setup"
	bind:this={setupForm}
	use:enhance={() => async ({ update }) => update({ reset: false, invalidateAll: false })}
	hidden
>
	<input type="hidden" name="itemId" value={setupItem} />
	<input type="hidden" name="cableHeight" value={setupHeight} />
	<input type="hidden" name="seatHeight" value={setupSeat} />
	<input type="hidden" name="support" value={setupSupport} />
</form>

<Sheet bind:open={picking} title="Add exercise">
	<ExercisePicker exercises={data.exercises} onpick={pick} />
</Sheet>

<Sheet open={!!hitFor} title={hitReplace ? 'Change HIT method' : 'Add HIT method'} onclose={closeHitSheet}>
	{#if hitItem}
		{@const used = methodsOf(hitItem)}
		<p class="muted hint">
			{#if hitReplace}
				Replace <strong>{hitMethod(hitReplace).name}</strong> on <strong>{hitItem.name}</strong>.
			{:else}
				Applied to <strong>{hitItem.name}</strong> when this routine starts.
			{/if}
		</p>
		<ul class="methods">
			{#each HIT_METHODS as m (m.key)}
				<li>
					<button type="button" style:--c={m.color} disabled={used.includes(m.key)} onclick={() => addHit(m.key)}>
						<span class="swatch"></span>
						<span class="m-text">
							<strong
								>{m.name}{m.key === hitReplace ? ' · current' : used.includes(m.key) ? ' · added' : ''}</strong
							>
							<span>{m.description}</span>
						</span>
					</button>
				</li>
			{/each}
		</ul>
	{/if}
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
	.title-block {
		flex: 1;
		min-width: 0;
	}
	.title-input {
		width: 100%;
		margin: 0;
		padding: 0.1rem 0;
		border: 0;
		border-bottom: 1.5px solid transparent;
		border-radius: 0;
		background: transparent;
		font: inherit;
		font-size: clamp(1.9rem, 6vw, 2.6rem);
		font-stretch: 118%;
		font-weight: 800;
		letter-spacing: -0.01em;
		line-height: 1.05;
		color: var(--ink);
	}
	.title-input:hover,
	.title-input:focus {
		border-bottom-color: var(--line-strong);
		outline: none;
	}
	.notes {
		margin-bottom: 1rem;
	}
	.hits {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.4rem;
		margin-top: 0.65rem;
	}
	.hit-chip {
		position: relative;
	}
	.hit-badge {
		padding: 0;
		border: 0;
		border-radius: 4px;
		background: none;
		cursor: pointer;
	}
	.hit-badge:focus-visible {
		outline: 2px solid var(--ink);
		outline-offset: 2px;
	}
	.hit-menu {
		position: absolute;
		left: 0;
		bottom: calc(100% + 0.25rem);
		z-index: 5;
		display: grid;
		min-width: 10.5rem;
		padding: 0.25rem;
		border: 1.5px solid var(--line-strong);
		border-radius: var(--radius-sm);
		background: var(--surface);
		box-shadow: var(--shadow);
	}
	.hit-menu button {
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
	.hit-menu button:hover {
		background: var(--paper-2);
	}
	.hit-menu button.remove {
		color: var(--danger);
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
	.items > li.hit {
		border-color: var(--c);
		background: color-mix(in srgb, var(--c) 14%, var(--surface));
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
	.rep-pair {
		display: flex;
		align-items: center;
		gap: 0.2rem;
		min-width: 0;
	}
	.targets .rep-pair input {
		flex: 1 1 0;
		width: 0;
		min-width: 0;
		padding-right: 0.3rem;
		padding-left: 0.3rem;
		text-align: center;
	}
	.rep-dash {
		flex: none;
		color: var(--steel);
		font-weight: 700;
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
