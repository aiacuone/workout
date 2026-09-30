import { error, json } from '@sveltejs/kit';
import { requireUser } from '$lib/server/util';
import { applyOp, getWorkoutState, type Op } from '$lib/server/workouts';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, params, request }) => {
	const user = requireUser(locals);
	if (!request.headers.get('content-type')?.includes('application/json')) error(415, 'Expected JSON');

	const op = (await request.json()) as Op;
	if (!op || typeof op.op !== 'string') error(400, 'Missing op');

	const result = await applyOp(user.id, params.id, op);
	if (result.status === 'discarded') return json({ id: params.id, status: 'discarded' });

	const state = await getWorkoutState(user.id, params.id);
	return json(state, { headers: { 'cache-control': 'no-store' } });
};
