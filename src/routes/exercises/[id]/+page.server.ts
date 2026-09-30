import { error, fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { EQUIPMENT, MUSCLE_GROUPS, getOwnedExercise, parseExerciseForm } from '$lib/server/exercises';
import { exerciseHistory } from '$lib/server/history';
import { requireUser } from '$lib/server/util';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireUser(locals);
	const exercise = await getOwnedExercise(user.id, params.id);
	if (!exercise) error(404, 'Exercise not found');
	return {
		exercise,
		history: await exerciseHistory(user.id, exercise.id),
		muscleGroups: MUSCLE_GROUPS,
		equipment: EQUIPMENT
	};
};

export const actions: Actions = {
	update: async ({ locals, params, request }) => {
		const user = requireUser(locals);
		if (!(await getOwnedExercise(user.id, params.id))) error(404);
		const parsed = parseExerciseForm(await request.formData());
		if ('error' in parsed) return fail(400, { error: parsed.error });
		await db.update(schema.exercise).set(parsed.values).where(eq(schema.exercise.id, params.id));
		return { saved: true };
	},
	archive: async ({ locals, params }) => {
		const user = requireUser(locals);
		if (!(await getOwnedExercise(user.id, params.id))) error(404);
		await db.update(schema.exercise).set({ archived: true }).where(eq(schema.exercise.id, params.id));
		redirect(303, '/exercises');
	},
	restore: async ({ locals, params }) => {
		const user = requireUser(locals);
		if (!(await getOwnedExercise(user.id, params.id))) error(404);
		await db.update(schema.exercise).set({ archived: false }).where(eq(schema.exercise.id, params.id));
		return { saved: true };
	}
};
