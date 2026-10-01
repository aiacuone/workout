<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import Sheet from '$lib/components/Sheet.svelte';
	import { toast, toastFormError } from '$lib/toast.svelte';
	import { cmToDisplay } from '$lib/units';

	let { data } = $props();
	const p = $derived(data.prefs!);
	const welcome = $derived(page.url.searchParams.has('welcome'));
	let importing = $state(false);
	let importingMeasure = $state(false);
	let confirmingHistory = $state(false);
	let deletingHistory = $state(false);

	function num(data: unknown, key: string) {
		if (!data || typeof data !== 'object' || !(key in data)) return 0;
		const value = (data as Record<string, unknown>)[key];
		return typeof value === 'number' ? value : 0;
	}

	function nested(data: unknown, key: string) {
		if (!data || typeof data !== 'object' || !(key in data)) return null;
		const value = (data as Record<string, unknown>)[key];
		return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
	}

	function strongImportMessage(data: unknown) {
		const result = nested(data, 'importResult');
		if (!result) return 'Import finished.';
		const bits = [`Imported ${num(result, 'workouts')} workouts`, `${num(result, 'sets')} sets`];
		const created = num(result, 'exercisesCreated');
		const skipped = num(result, 'skippedExisting');
		if (created) bits.push(`${created} new exercises`);
		if (skipped) bits.push(`${skipped} already present`);
		const routines = nested(data, 'routinesFromLatest');
		if (routines) {
			bits.push(`${num(routines, 'created')} routines created`);
			const existing = num(routines, 'skippedExisting');
			if (existing) bits.push(`${existing} routines already existed`);
		}
		return bits.join(' · ');
	}

	function measureImportMessage(data: unknown) {
		const result = nested(data, 'measureImportResult');
		if (!result) return 'Import finished.';
		const bits = [`Imported ${num(result, 'inserted')} days`];
		const updated = num(result, 'updated');
		const skipped = num(result, 'skipped');
		const unknown = num(result, 'unknownRows');
		if (updated) bits.push(`${updated} updated`);
		if (skipped) bits.push(`${skipped} already present`);
		if (unknown) bits.push(`${unknown} rows skipped`);
		return bits.join(' · ');
	}
</script>

<svelte:head><title>Settings · Strongr</title></svelte:head>

<div class="page">
	<div class="page-head">
		<div>
			<p class="eyebrow">Signed in as {data.user?.username}</p>
			<h1>Settings</h1>
		</div>
	</div>

	{#if welcome}
		<div class="welcome">
			<strong>Welcome to Strongr.</strong>
			<span>Set your units, sex and height so body-fat estimates are right. 54 common exercises are already in your library.</span>
		</div>
	{/if}

	<form
		method="POST"
		action="?/prefs"
		class="card stack"
		use:enhance={() =>
			async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'success') toast('Saved.');
			}}
	>
		<h2>Preferences</h2>
		<div class="grid">
			<fieldset>
				<legend>Weight</legend>
				<div class="seg">
					<label><input type="radio" name="weightUnit" value="kg" checked={p.weightUnit === 'kg'} /><span>kg</span></label>
					<label><input type="radio" name="weightUnit" value="lb" checked={p.weightUnit === 'lb'} /><span>lb</span></label>
				</div>
			</fieldset>
			<fieldset>
				<legend>Length</legend>
				<div class="seg">
					<label><input type="radio" name="lengthUnit" value="cm" checked={p.lengthUnit === 'cm'} /><span>cm</span></label>
					<label><input type="radio" name="lengthUnit" value="in" checked={p.lengthUnit === 'in'} /><span>in</span></label>
				</div>
			</fieldset>
			<fieldset>
				<legend>Sex (body-fat formula)</legend>
				<div class="seg">
					<label><input type="radio" name="sex" value="male" checked={p.sex === 'male'} /><span>Male</span></label>
					<label><input type="radio" name="sex" value="female" checked={p.sex === 'female'} /><span>Female</span></label>
				</div>
			</fieldset>
			<label class="field">
				Height ({p.lengthUnit})
				<input name="height" inputmode="decimal" value={cmToDisplay(p.heightCm, p.lengthUnit)} />
			</label>
			<label class="field">
				Default rest timer (seconds)
				<input name="defaultRestSec" type="number" inputmode="numeric" min="0" max="900" value={p.defaultRestSec} />
			</label>
		</div>
		<button class="btn primary">Save preferences</button>
	</form>

	<form
		method="POST"
		action="?/password"
		class="card stack"
		use:enhance={() =>
			async ({ result, update }) => {
				await update({ reset: false });
				if (result.type === 'failure') toastFormError(result.data);
				if (result.type === 'success') toast('Password changed. Other devices were signed out.');
			}}
	>
		<h2>Change password</h2>
		<input type="text" name="username" autocomplete="username" value={data.user?.username} hidden />
		<label class="field">Current password<input name="current" type="password" autocomplete="current-password" required /></label>
		<label class="field">New password<input name="next" type="password" autocomplete="new-password" minlength="8" required /></label>
		<label class="field">Confirm new password<input name="confirm" type="password" autocomplete="new-password" required /></label>
		<button class="btn">Change password</button>
	</form>

	<form
		method="POST"
		action="?/importStrong"
		enctype="multipart/form-data"
		class="card stack"
		use:enhance={() => {
			importing = true;
			return async ({ result, update }) => {
				await update({ reset: false });
				importing = false;
				if (result.type === 'failure') toastFormError(result.data);
				if (result.type === 'success') toast(strongImportMessage(result.data));
			};
		}}
	>
		<h2>Import from Strong</h2>
		<p class="muted help">
			Upload <code>import/strong-export-last-2-years.csv</code> — the remapped Strong history (last 2 years,
			exercise names already matched to your library). After import, a routine is created from the
			<strong>latest</strong> session of each workout name (skipped if that routine already exists).
			Workouts you’ve already imported (same name + start time) are skipped.
		</p>
		<label class="field">
			Strong CSV file
			<input name="file" type="file" accept=".csv,text/csv" required disabled={importing} />
		</label>
		<fieldset>
			<legend>Weights in this file are in</legend>
			<div class="seg">
				<label
					><input
						type="radio"
						name="importWeightUnit"
						value="kg"
						checked={p.weightUnit === 'kg'}
					/><span>kg</span></label
				>
				<label
					><input
						type="radio"
						name="importWeightUnit"
						value="lb"
						checked={p.weightUnit === 'lb'}
					/><span>lb</span></label
				>
			</div>
		</fieldset>
		<button class="btn primary" disabled={importing}>{importing ? 'Importing…' : 'Import CSV'}</button>
	</form>

	<form
		method="POST"
		action="?/importMeasurements"
		enctype="multipart/form-data"
		class="card stack"
		use:enhance={() => {
			importingMeasure = true;
			return async ({ result, update }) => {
				await update({ reset: false });
				importingMeasure = false;
				if (result.type === 'failure') toastFormError(result.data);
				if (result.type === 'success') toast(measureImportMessage(result.data));
			};
		}}
	>
		<h2>Import from Body Measurement Tracker</h2>
		<p class="muted help">
			Upload <code>import/bmt-measurements.csv</code> — the Body Measurement Tracker export (the file that
			starts with <code># BMT Measurement Export</code>). Rows on the same date are combined. Body fat is
			filled in with the US Navy formula when the file doesn’t include it. Dates you’ve already imported
			are skipped; empty fields on those dates are filled in.
		</p>
		<label class="field">
			Measurements CSV file
			<input name="file" type="file" accept=".csv,text/csv" required disabled={importingMeasure} />
		</label>
		<button class="btn primary" disabled={importingMeasure}
			>{importingMeasure ? 'Importing…' : 'Import CSV'}</button
		>
	</form>

	<div class="card stack">
		<h2>More</h2>
		<a class="btn" href="/routines">Manage routines</a>
		<a class="btn" href="/history">View history</a>
		<button type="button" class="btn danger" onclick={() => (confirmingHistory = true)}>
			Delete all workout history
		</button>
		<form method="POST" action="/logout"><button class="btn danger block">Sign out</button></form>
	</div>
</div>

<Sheet bind:open={confirmingHistory} title="Delete all workout history?">
	<p class="muted">
		This removes every finished workout and its sets. Measurements, exercises, and routines stay. A workout
		in progress is left alone.
	</p>
	{#snippet footer()}
		<form
			method="POST"
			action="?/deleteHistory"
			class="actions"
			use:enhance={() => {
				deletingHistory = true;
				return async ({ result, update }) => {
					deletingHistory = false;
					if (result.type === 'success') {
						confirmingHistory = false;
						await update({ reset: false });
						toast('Workout history deleted. Measurements were kept.');
					}
				};
			}}
		>
			<button type="button" class="btn block" disabled={deletingHistory} onclick={() => (confirmingHistory = false)}>
				Cancel
			</button>
			<button class="btn danger block" disabled={deletingHistory}>
				{deletingHistory ? 'Deleting…' : 'Delete all workout history'}
			</button>
		</form>
	{/snippet}
</Sheet>

<style>
	.welcome {
		display: grid;
		gap: 0.2rem;
		margin-bottom: 1rem;
		padding: 0.9rem 1rem;
		border: 1.5px solid var(--lime);
		border-radius: var(--radius);
		background: var(--lime);
		color: var(--on-lime);
	}
	.card {
		margin-bottom: 1rem;
		padding: 1rem;
		border: 1px solid var(--line);
		border-radius: var(--radius);
		background: var(--surface);
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.9rem;
	}
	fieldset {
		margin: 0;
		padding: 0;
		border: 0;
	}
	legend {
		margin-bottom: 0.3rem;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--ink-2);
	}
	.seg {
		display: flex;
		padding: 3px;
		border-radius: 8px;
		background: var(--paper-2);
	}
	.seg label {
		flex: 1;
	}
	.seg input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.seg span {
		display: grid;
		place-items: center;
		min-height: 38px;
		border-radius: 6px;
		font-weight: 750;
		cursor: pointer;
	}
	.seg input:checked + span {
		background: var(--chrome);
		color: var(--lime);
	}
	.seg input:focus-visible + span {
		outline: 3px solid var(--lime);
	}
	.help {
		font-size: 0.9rem;
		line-height: 1.4;
	}
	input[type='file'] {
		padding: 0.55rem 0;
		border: 0;
		background: transparent;
		color: var(--ink-2);
	}
	.actions {
		display: grid;
		gap: 0.5rem;
	}
</style>
