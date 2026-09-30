import { redirect } from '@sveltejs/kit';
import { requireUser } from '$lib/server/util';
import { startWorkout } from '$lib/server/workouts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	const user = requireUser(locals);
	const form = await request.formData();
	const routineId = form.get('routineId');
	await startWorkout(user.id, typeof routineId === 'string' && routineId ? routineId : null);
	redirect(303, '/workout/active');
};
