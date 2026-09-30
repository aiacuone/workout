import { redirect } from '@sveltejs/kit';
import { listExercises } from '$lib/server/exercises';
import { getActiveWorkout, requireUser } from '$lib/server/util';
import { getWorkoutState } from '$lib/server/workouts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, depends }) => {
	depends('app:active-workout');
	const user = requireUser(locals);
	const active = await getActiveWorkout(user.id);
	if (!active) redirect(303, '/routines');
	const [workout, exercises] = await Promise.all([
		getWorkoutState(user.id, active.id),
		listExercises(user.id)
	]);
	if (!workout) redirect(303, '/routines');
	return { workout, exercises };
};
