import { requireUser } from '$lib/server/util';
import { listCompletedWorkouts } from '$lib/server/workout-list';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	return { workouts: await listCompletedWorkouts(user.id, 300) };
};
