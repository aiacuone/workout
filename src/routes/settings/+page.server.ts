import { fail } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import {
	hashPassword,
	invalidateUserSessions,
	SESSION_COOKIE,
	verifyPassword
} from '$lib/server/auth';
import { db, schema } from '$lib/server/db';
import { createRoutinesFromLatestWorkouts } from '$lib/server/routines';
import { importBmtCsv } from '$lib/server/measurements-import';
import { importStrongCsv } from '$lib/server/strong-import';
import { getPrefs, optNum, requireUser, str } from '$lib/server/util';
import { displayToCm } from '$lib/units';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	return { prefs: await getPrefs(user.id) };
};

export const actions: Actions = {
	prefs: async ({ locals, request }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const current = await getPrefs(user.id);

		const weightUnit = str(form, 'weightUnit') === 'lb' ? 'lb' : 'kg';
		const lengthUnit = str(form, 'lengthUnit') === 'in' ? 'in' : 'cm';
		const sex = str(form, 'sex') === 'female' ? 'female' : 'male';
		const rest = optNum(form, 'defaultRestSec');
		// Height is typed in the unit shown when the form rendered, not the newly chosen one.
		const heightCm = displayToCm(str(form, 'height'), current.lengthUnit);

		await db
			.update(schema.userPrefs)
			.set({
				weightUnit,
				lengthUnit,
				sex,
				heightCm,
				defaultRestSec: rest == null ? 90 : Math.max(0, Math.min(900, Math.round(rest)))
			})
			.where(eq(schema.userPrefs.userId, user.id));
		return { prefsSaved: true };
	},

	password: async ({ locals, request, cookies }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const currentPw = str(form, 'current');
		const next = str(form, 'next');

		const [u] = await db.select().from(schema.user).where(eq(schema.user.id, user.id));
		if (!u || !(await verifyPassword(currentPw, u.passwordHash)))
			return fail(400, { pwError: 'Current password is wrong.' });
		if (next.length < 8) return fail(400, { pwError: 'New password must be at least 8 characters.' });
		if (next !== str(form, 'confirm')) return fail(400, { pwError: 'Passwords do not match.' });

		await db
			.update(schema.user)
			.set({ passwordHash: await hashPassword(next) })
			.where(eq(schema.user.id, user.id));
		await invalidateUserSessions(user.id, cookies.get(SESSION_COOKIE));
		return { pwSaved: true };
	},

	importStrong: async ({ locals, request }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const file = form.get('file');
		if (!(file instanceof File) || file.size === 0)
			return fail(400, { importError: 'Choose a Strong CSV export file.' });
		if (file.size > 40 * 1024 * 1024)
			return fail(400, { importError: 'File is too large (max 40 MB).' });

		const prefs = await getPrefs(user.id);
		const unitField = str(form, 'importWeightUnit');
		const weightUnit =
			unitField === 'lb' ? 'lb' : unitField === 'kg' ? 'kg' : prefs.weightUnit;

		try {
			const text = await file.text();
			const result = await importStrongCsv(user.id, text, weightUnit);
			const routines = await createRoutinesFromLatestWorkouts(user.id);
			return { importResult: result, routinesFromLatest: routines };
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Import failed.';
			return fail(400, { importError: message });
		}
	},

	importMeasurements: async ({ locals, request }) => {
		const user = requireUser(locals);
		const form = await request.formData();
		const file = form.get('file');
		if (!(file instanceof File) || file.size === 0)
			return fail(400, { measureImportError: 'Choose a Body Measurement Tracker CSV export.' });
		if (file.size > 10 * 1024 * 1024)
			return fail(400, { measureImportError: 'File is too large (max 10 MB).' });

		const prefs = await getPrefs(user.id);
		try {
			const result = await importBmtCsv(user.id, await file.text(), {
				sex: prefs.sex,
				heightCm: prefs.heightCm
			});
			return { measureImportResult: result };
		} catch (e) {
			const message = e instanceof Error ? e.message : 'Import failed.';
			return fail(400, { measureImportError: message });
		}
	}
};
