import { error, fail, redirect } from '@sveltejs/kit';
import { and, eq, sql } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { getOwnedExercise, listExercises } from '$lib/server/exercises';
import { getOwnedRoutine, routineItems } from '$lib/server/routines';
import { getPrefs, optNum, optStr, requireUser, str } from '$lib/server/util';
import { composeRepRange } from '$lib/rep-range';
import { displayToKg } from '$lib/units';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireUser(locals);
	const routine = await getOwnedRoutine(user.id, params.id);
	if (!routine) error(404, 'Routine not found');
	const [items, exercises] = await Promise.all([routineItems([routine.id]), listExercises(user.id)]);
	return { routine, items, exercises };
};

async function owned(locals: App.Locals, id: string) {
	const user = requireUser(locals);
	const routine = await getOwnedRoutine(user.id, id);
	if (!routine) error(404, 'Routine not found');
	return { user, routine };
}

async function touch(id: string) {
	await db.update(schema.routine).set({ updatedAt: new Date() }).where(eq(schema.routine.id, id));
}

async function renumber(routineId: string) {
	const items = await routineItems([routineId]);
	await Promise.all(
		items.map((it, i) =>
			db.update(schema.routineExercise).set({ position: i }).where(eq(schema.routineExercise.id, it.id))
		)
	);
}

export const actions: Actions = {
	rename: async ({ locals, params, request }) => {
		const { routine } = await owned(locals, params.id);
		const form = await request.formData();
		const name = str(form, 'name');
		if (!name) return fail(400, { error: 'Name is required.' });
		await db
			.update(schema.routine)
			.set({ name: name.slice(0, 80), notes: optStr(form, 'notes'), updatedAt: new Date() })
			.where(eq(schema.routine.id, routine.id));
		return { saved: true };
	},

	addExercise: async ({ locals, params, request }) => {
		const { user, routine } = await owned(locals, params.id);
		const exerciseId = str(await request.formData(), 'exerciseId');
		if (!(await getOwnedExercise(user.id, exerciseId))) return fail(400, { error: 'Unknown exercise.' });
		const [{ max }] = await db
			.select({ max: sql<number>`coalesce(max(${schema.routineExercise.position}), -1)` })
			.from(schema.routineExercise)
			.where(eq(schema.routineExercise.routineId, routine.id));
		await db.insert(schema.routineExercise).values({
			routineId: routine.id,
			exerciseId,
			position: Number(max) + 1,
			targetSets: 3
		});
		await touch(routine.id);
	},

	updateItem: async ({ locals, params, request }) => {
		const { user, routine } = await owned(locals, params.id);
		const form = await request.formData();
		const prefs = await getPrefs(user.id);
		const sets = optNum(form, 'targetSets');
		const repRange =
			(form.has('repMin') || form.has('repMax')
				? composeRepRange(str(form, 'repMin'), str(form, 'repMax'))
				: optStr(form, 'repRange')
			)?.slice(0, 20) ?? null;
		await db
			.update(schema.routineExercise)
			.set({
				targetSets: Math.max(1, Math.min(20, Math.round(sets ?? 3))),
				repRange,
				targetWeightKg: displayToKg(str(form, 'targetWeight'), prefs.weightUnit)
			})
			.where(
				and(
					eq(schema.routineExercise.id, str(form, 'itemId')),
					eq(schema.routineExercise.routineId, routine.id)
				)
			);
		await touch(routine.id);
	},

	move: async ({ locals, params, request }) => {
		const { routine } = await owned(locals, params.id);
		const form = await request.formData();
		const itemId = str(form, 'itemId');
		const dir = str(form, 'dir') === 'up' ? -1 : 1;
		const items = await routineItems([routine.id]);
		const idx = items.findIndex((i) => i.id === itemId);
		const swap = items[idx + dir];
		if (idx < 0 || !swap) return;
		await db
			.update(schema.routineExercise)
			.set({ position: swap.position })
			.where(eq(schema.routineExercise.id, items[idx].id));
		await db
			.update(schema.routineExercise)
			.set({ position: items[idx].position })
			.where(eq(schema.routineExercise.id, swap.id));
		await renumber(routine.id);
	},

	removeItem: async ({ locals, params, request }) => {
		const { routine } = await owned(locals, params.id);
		const itemId = str(await request.formData(), 'itemId');
		await db
			.delete(schema.routineExercise)
			.where(and(eq(schema.routineExercise.id, itemId), eq(schema.routineExercise.routineId, routine.id)));
		await renumber(routine.id);
		await touch(routine.id);
	},

	delete: async ({ locals, params }) => {
		const { routine } = await owned(locals, params.id);
		await db.delete(schema.routine).where(eq(schema.routine.id, routine.id));
		redirect(303, '/routines');
	}
};
