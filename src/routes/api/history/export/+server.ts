import { json } from '@sveltejs/kit';
import { loadHistoryExport } from '$lib/server/history-export';
import { requireUser } from '$lib/server/util';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
	const user = requireUser(locals);
	return json({ workouts: await loadHistoryExport(user.id) });
};
