import { redirect } from '@sveltejs/kit';
import { googleConfigured } from '$lib/server/google';
import type { PageServerLoad } from './$types';

const ERRORS: Record<string, string> = {
	cancelled: 'Sign-in was cancelled.',
	failed: 'Google sign-in failed. Try again.',
	not_allowed: 'That Google account is not on the list.',
	rate: 'Too many attempts. Try again in 15 minutes.'
};

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) redirect(303, '/');
	const code = url.searchParams.get('error') ?? '';
	return {
		configured: googleConfigured(),
		error: ERRORS[code] ?? ''
	};
};
