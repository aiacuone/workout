import { fail } from '@sveltejs/kit';
import { and, asc, eq } from 'drizzle-orm';
import { navyBodyFat } from '$lib/bodyfat';
import { MEASUREMENT_FIELDS } from '$lib/measurements';
import { db, schema } from '$lib/server/db';
import { getPrefs, optStr, requireUser, str } from '$lib/server/util';
import { displayToCm, displayToKg } from '$lib/units';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	const entries = await db
		.select()
		.from(schema.bodyMeasurement)
		.where(eq(schema.bodyMeasurement.userId, user.id))
		.orderBy(asc(schema.bodyMeasurement.measuredOn), asc(schema.bodyMeasurement.createdAt));
	return {
		entries: entries.map(({ createdAt, userId, ...e }) => e)
	};
};

async function owned(userId: string, id: string) {
	const [row] = await db
		.select()
		.from(schema.bodyMeasurement)
		.where(and(eq(schema.bodyMeasurement.id, id), eq(schema.bodyMeasurement.userId, userId)));
	return row ?? null;
}

export const actions: Actions = {
	saveWeight: async ({ locals, request }) => {
		const user = requireUser(locals);
		const prefs = await getPrefs(user.id);
		const form = await request.formData();

		const measuredOn = str(form, 'measuredOn');
		if (!/^\d{4}-\d{2}-\d{2}$/.test(measuredOn)) return fail(400, { error: 'Pick a valid date.', kind: 'weight' });

		const weightKg = displayToKg(str(form, 'weight'), prefs.weightUnit);
		if (weightKg == null) return fail(400, { error: 'Enter a weight.', kind: 'weight' });

		const notes = optStr(form, 'notes');
		const id = str(form, 'id');

		if (id) {
			if (!(await owned(user.id, id))) return fail(404, { error: 'Entry not found.', kind: 'weight' });
			await db
				.update(schema.bodyMeasurement)
				.set({ measuredOn, weightKg, notes })
				.where(and(eq(schema.bodyMeasurement.id, id), eq(schema.bodyMeasurement.userId, user.id)));
		} else {
			await db.insert(schema.bodyMeasurement).values({
				userId: user.id,
				measuredOn,
				weightKg,
				notes
			});
		}
		return { saved: true };
	},

	saveMeasurements: async ({ locals, request }) => {
		const user = requireUser(locals);
		const prefs = await getPrefs(user.id);
		const form = await request.formData();

		const measuredOn = str(form, 'measuredOn');
		if (!/^\d{4}-\d{2}-\d{2}$/.test(measuredOn))
			return fail(400, { error: 'Pick a valid date.', kind: 'measure' });

		const lengths = Object.fromEntries(
			MEASUREMENT_FIELDS.map((f) => [f.key, displayToCm(str(form, f.key), prefs.lengthUnit)])
		) as Record<(typeof MEASUREMENT_FIELDS)[number]['key'], number | null>;

		const heightCm = displayToCm(str(form, 'height'), prefs.lengthUnit) ?? prefs.heightCm;

		if (Object.values(lengths).every((v) => v == null))
			return fail(400, { error: 'Enter at least one circumference.', kind: 'measure' });

		if (heightCm && heightCm !== prefs.heightCm)
			await db.update(schema.userPrefs).set({ heightCm }).where(eq(schema.userPrefs.userId, user.id));

		const values = {
			measuredOn,
			...lengths,
			heightCm: heightCm ?? null,
			bodyFatPct: navyBodyFat({
				sex: prefs.sex,
				heightCm,
				neckCm: lengths.neckCm,
				waistCm: lengths.waistCm,
				hipsCm: lengths.hipsCm
			}),
			notes: optStr(form, 'notes')
		};

		const id = str(form, 'id');
		if (id) {
			if (!(await owned(user.id, id))) return fail(404, { error: 'Entry not found.', kind: 'measure' });
			// Keep any existing weight on this row untouched.
			await db
				.update(schema.bodyMeasurement)
				.set(values)
				.where(and(eq(schema.bodyMeasurement.id, id), eq(schema.bodyMeasurement.userId, user.id)));
		} else {
			await db.insert(schema.bodyMeasurement).values({ ...values, userId: user.id, weightKg: null });
		}
		return { saved: true };
	},

	delete: async ({ locals, request }) => {
		const user = requireUser(locals);
		const id = str(await request.formData(), 'id');
		await db
			.delete(schema.bodyMeasurement)
			.where(and(eq(schema.bodyMeasurement.id, id), eq(schema.bodyMeasurement.userId, user.id)));
		return { saved: true };
	}
};
