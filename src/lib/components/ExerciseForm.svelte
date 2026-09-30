<script lang="ts">
	type Values = {
		name?: string;
		muscleGroup?: string;
		equipment?: string;
		restSec?: number | null;
		notes?: string | null;
	};

	let {
		values = {},
		muscleGroups,
		equipment
	}: { values?: Values; muscleGroups: string[]; equipment: string[] } = $props();
</script>

<div class="stack">
	<label class="field">
		Name
		<input name="name" required maxlength="80" value={values.name ?? ''} />
	</label>
	<div class="two">
		<label class="field">
			Muscle group
			<select name="muscleGroup" required value={values.muscleGroup ?? ''}>
				<option value="" disabled>Select…</option>
				{#each muscleGroups as g (g)}<option>{g}</option>{/each}
			</select>
		</label>
		<label class="field">
			Equipment
			<select name="equipment" required value={values.equipment ?? ''}>
				<option value="" disabled>Select…</option>
				{#each equipment as e (e)}<option>{e}</option>{/each}
			</select>
		</label>
	</div>
	<label class="field">
		Rest timer (seconds, blank = default)
		<input name="restSec" type="number" inputmode="numeric" min="0" max="900" value={values.restSec ?? ''} />
	</label>
	<label class="field">
		Notes
		<textarea name="notes" rows="3">{values.notes ?? ''}</textarea>
	</label>
</div>

<style>
	.two {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.75rem;
	}
</style>
