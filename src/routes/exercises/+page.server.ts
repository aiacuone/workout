import { fail, redirect } from '@sveltejs/kit';
import { and, asc, count, eq, sql } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { EQUIPMENT, MUSCLE_GROUPS, listExercises, parseExerciseForm } from '$lib/server/exercises';
import { requireUser } from '$lib/server/util';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	const [exercises, archived, usage] = await Promise.all([
		listExercises(user.id),
		db
			.select({ id: schema.exercise.id, name: schema.exercise.name })
			.from(schema.exercise)
			.where(and(eq(schema.exercise.userId, user.id), eq(schema.exercise.archived, true)))
			.orderBy(asc(schema.exercise.name)),
		db
			.select({ exerciseId: schema.workoutExercise.exerciseId, n: count() })
			.from(schema.workoutExercise)
			.innerJoin(schema.workout, eq(schema.workout.id, schema.workoutExercise.workoutId))
			.where(sql`${schema.workout.userId} = ${user.id} and ${schema.workout.status} = 'completed'`)
			.groupBy(schema.workoutExercise.exerciseId)
	]);
	const uses = Object.fromEntries(usage.map((u) => [u.exerciseId, u.n]));
	return {
		exercises: exercises.map((e) => ({ ...e, uses: uses[e.id] ?? 0 })),
		archived,
		muscleGroups: MUSCLE_GROUPS,
		equipment: EQUIPMENT
	};
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const user = requireUser(locals);
		const parsed = parseExerciseForm(await request.formData());
		if ('error' in parsed) return fail(400, { error: parsed.error });
		const [ex] = await db
			.insert(schema.exercise)
			.values({ ...parsed.values, userId: user.id })
			.returning({ id: schema.exercise.id });
		redirect(303, `/exercises/${ex.id}`);
	}
};
