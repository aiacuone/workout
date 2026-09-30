import { redirect } from '@sveltejs/kit';
import { listRoutines } from '$lib/server/routines';
import { getActiveWorkout, requireUser } from '$lib/server/util';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	if (await getActiveWorkout(user.id)) redirect(303, '/workout/active');
	return { routines: await listRoutines(user.id) };
};
