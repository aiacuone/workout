import { redirect } from '@sveltejs/kit';
import {
	clearFailures,
	createSession,
	isRateLimited,
	recordFailure,
	setSessionCookie,
	signInGoogleUser
} from '$lib/server/auth';
import { fetchGoogleProfile, isAllowedEmail, takeOAuthCookies } from '$lib/server/google';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ cookies, getClientAddress, url }) => {
	const saved = takeOAuthCookies(cookies);
	if (url.searchParams.get('error')) redirect(303, '/login?error=cancelled');

	const code = url.searchParams.get('code');
	const state = url.searchParams.get('state');
	const verifier = saved.verifier;
	if (!code || !state || !verifier || state !== saved.state) redirect(303, '/login?error=failed');

	const ip = getClientAddress();
	if (isRateLimited(ip)) redirect(303, '/login?error=rate');

	const profile = await fetchGoogleProfile(code, verifier, url.origin);
	if (!profile) {
		recordFailure(ip);
		redirect(303, '/login?error=failed');
	}
	if (!isAllowedEmail(profile.email)) {
		recordFailure(ip);
		redirect(303, '/login?error=not_allowed');
	}
	clearFailures(ip);

	const user = await signInGoogleUser(profile);
	const { token, expiresAt } = await createSession(user.id);
	setSessionCookie(cookies, token, expiresAt, url.protocol === 'https:');
	redirect(303, user.created ? '/settings?welcome=1' : '/');
};
