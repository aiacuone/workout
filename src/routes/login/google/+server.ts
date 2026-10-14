import { redirect } from '@sveltejs/kit';
import { beginGoogleAuth, googleConfigured } from '$lib/server/google';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, locals, url }) => {
	if (locals.user) redirect(303, '/');
	if (!googleConfigured()) redirect(303, '/login');

	const target = beginGoogleAuth(cookies, url.origin, url.protocol === 'https:');
	if (!target) redirect(303, '/login');
	redirect(303, target);
};
