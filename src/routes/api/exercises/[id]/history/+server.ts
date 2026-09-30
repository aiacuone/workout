import { error, json } from '@sveltejs/kit';
import { getOwnedExercise } from '$lib/server/exercises';
import { exerciseHistory } from '$lib/server/history';
import { requireUser } from '$lib/server/util';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params }) => {
	const user = requireUser(locals);
	const exercise = await getOwnedExercise(user.id, params.id);
	if (!exercise) error(404, 'Exercise not found');
	return json({
		exercise: { id: exercise.id, name: exercise.name, notes: exercise.notes },
		sessions: await exerciseHistory(user.id, exercise.id)
	});
};
