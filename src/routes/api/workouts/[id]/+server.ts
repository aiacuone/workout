import { error, json } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { requireUser } from '$lib/server/util';
import { getWorkoutState } from '$lib/server/workouts';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals, params, url }) => {
	const user = requireUser(locals);

	const since = url.searchParams.get('since');
	if (since !== null) {
		const [w] = await db
			.select({ version: schema.workout.version, userId: schema.workout.userId, status: schema.workout.status })
			.from(schema.workout)
			.where(eq(schema.workout.id, params.id));
		if (!w || w.userId !== user.id) error(404, 'Workout not found');
		if (w.version === Number(since) && w.status === 'in_progress')
			return json({ unchanged: true }, { headers: { 'cache-control': 'no-store' } });
	}

	const state = await getWorkoutState(user.id, params.id);
	if (!state) error(404, 'Workout not found');
	return json(state, { headers: { 'cache-control': 'no-store' } });
};
