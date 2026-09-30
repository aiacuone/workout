<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/state';
	import { cmToDisplay } from '$lib/units';

	let { data, form } = $props();
	const p = $derived(data.prefs!);
	const welcome = $derived(page.url.searchParams.has('welcome'));
	let importing = $state(false);
	let importingMeasure = $state(false);
</script>

<svelte:head><title>Settings · Ironlog</title></svelte:head>

<div class="page">
	<div class="page-head">
		<div>
			<p class="eyebrow">Signed in as {data.user?.username}</p>
			<h1>Settings</h1>
		</div>
	</div>

	{#if welcome}
		<div class="welcome">
			<strong>Welcome to Ironlog.</strong>
			<span>Set your units, sex and height so body-fat estimates are right. 54 common exercises are already in your library.</span>
		</div>
	{/if}

	<form method="POST" action="?/prefs" class="card stack" use:enhance={() => async ({ update }) => update({ reset: false })}>
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
		{#if form?.prefsSaved}<p class="ok">Saved.</p>{/if}
		<button class="btn primary">Save preferences</button>
	</form>

	<form method="POST" action="?/password" class="card stack" use:enhance>
		<h2>Change password</h2>
		{#if form?.pwError}<p class="form-error">{form.pwError}</p>{/if}
		{#if form?.pwSaved}<p class="ok">Password changed. Other devices were signed out.</p>{/if}
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
			return async ({ update }) => {
				await update({ reset: false });
				importing = false;
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
		{#if form?.importError}<p class="form-error">{form.importError}</p>{/if}
		{#if form?.importResult}
			<p class="ok">
				Imported {form.importResult.workouts} workouts · {form.importResult.sets} sets
				{#if form.importResult.exercisesCreated} · {form.importResult.exercisesCreated} new exercises{/if}
				{#if form.importResult.skippedExisting} · {form.importResult.skippedExisting} already present{/if}
				{#if form.routinesFromLatest}
					· {form.routinesFromLatest.created} routines created
					{#if form.routinesFromLatest.skippedExisting}
						({form.routinesFromLatest.skippedExisting} already existed){/if}
				{/if}
			</p>
		{/if}
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
			return async ({ update }) => {
				await update({ reset: false });
				importingMeasure = false;
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
		{#if form?.measureImportError}<p class="form-error">{form.measureImportError}</p>{/if}
		{#if form?.measureImportResult}
			<p class="ok">
				Imported {form.measureImportResult.inserted} days
				{#if form.measureImportResult.updated} · {form.measureImportResult.updated} updated{/if}
				{#if form.measureImportResult.skipped} · {form.measureImportResult.skipped} already present{/if}
				{#if form.measureImportResult.unknownRows}
					· {form.measureImportResult.unknownRows} rows skipped{/if}
			</p>
		{/if}
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
		<form method="POST" action="/logout"><button class="btn danger block">Sign out</button></form>
	</div>
</div>

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
	.ok {
		font-weight: 700;
		color: var(--lime-deep);
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
</style>
