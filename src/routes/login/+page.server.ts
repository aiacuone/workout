import { fail, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import {
	clearFailures,
	createOwner,
	createSession,
	hasAnyUser,
	isRateLimited,
	recordFailure,
	setSessionCookie,
	verifyPassword
} from '$lib/server/auth';
import { db, schema } from '$lib/server/db';
import { str } from '$lib/server/util';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(303, '/');
	return { setup: !(await hasAnyUser()) };
};

export const actions: Actions = {
	login: async ({ request, cookies, getClientAddress, url }) => {
		const ip = getClientAddress();
		if (isRateLimited(ip))
			return fail(429, { error: 'Too many attempts. Try again in 15 minutes.', username: '' });

		const form = await request.formData();
		const username = str(form, 'username').toLowerCase();
		const password = str(form, 'password');

		const [u] = await db.select().from(schema.user).where(eq(schema.user.username, username));
		if (!u || !(await verifyPassword(password, u.passwordHash))) {
			recordFailure(ip);
			return fail(400, { error: 'Wrong username or password.', username });
		}
		clearFailures(ip);

		const { token, expiresAt } = await createSession(u.id);
		setSessionCookie(cookies, token, expiresAt, url.protocol === 'https:');
		redirect(303, '/');
	},

	setup: async ({ request, cookies, url }) => {
		if (await hasAnyUser())
			return fail(403, { error: 'An account already exists. Sign in instead.', username: '' });

		const form = await request.formData();
		const username = str(form, 'username').toLowerCase();
		const password = str(form, 'password');
		const confirm = str(form, 'confirm');

		if (!/^[a-z0-9_.-]{3,32}$/.test(username))
			return fail(400, { error: 'Username: 3–32 letters, numbers, . _ or -', username });
		if (password.length < 8) return fail(400, { error: 'Password must be at least 8 characters.', username });
		if (password !== confirm) return fail(400, { error: 'Passwords do not match.', username });

		const owner = await createOwner(username, password);
		const { token, expiresAt } = await createSession(owner.id);
		setSessionCookie(cookies, token, expiresAt, url.protocol === 'https:');
		redirect(303, '/settings?welcome=1');
	}
};
