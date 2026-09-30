import { redirect } from '@sveltejs/kit';
import { clearSessionCookie, invalidateSession, SESSION_COOKIE } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
	const token = cookies.get(SESSION_COOKIE);
	if (token) await invalidateSession(token);
	clearSessionCookie(cookies);
	redirect(303, '/login');
};
