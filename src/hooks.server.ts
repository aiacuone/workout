import { error, redirect, type Handle } from '@sveltejs/kit';
import { SESSION_COOKIE, setSessionCookie, validateSession } from '$lib/server/auth';

const PUBLIC_PATHS = ['/login'];

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get(SESSION_COOKIE);
	event.locals.user = null;

	if (token) {
		const result = await validateSession(token);
		if (result) {
			event.locals.user = result.user;
			setSessionCookie(event.cookies, token, result.expiresAt, event.url.protocol === 'https:');
		} else {
			event.cookies.delete(SESSION_COOKIE, { path: '/' });
		}
	}

	const path = event.url.pathname;
	const isPublic =
		PUBLIC_PATHS.includes(path) ||
		path.startsWith('/_app/') ||
		/\.(png|svg|ico|webmanifest|js|css|woff2?)$/.test(path);

	if (!event.locals.user && !isPublic) {
		if (path.startsWith('/api/')) error(401, 'Not signed in');
		redirect(303, '/login');
	}

	return resolve(event);
};
