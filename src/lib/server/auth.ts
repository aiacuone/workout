import { createHash, randomBytes } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from './db';
import { DEFAULT_EXERCISES } from './db/default-exercises';

const DAY = 24 * 60 * 60 * 1000;
const SESSION_TTL = 60 * DAY;

export const SESSION_COOKIE = 'session';

export type GoogleProfile = { sub: string; email: string; name: string };

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

async function uniqueDisplayName(
	tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
	name: string
) {
	const base = name.trim().slice(0, 40) || 'Athlete';
	for (let i = 0; i < 20; i++) {
		const candidate = i === 0 ? base : `${base} ${i + 1}`;
		const [row] = await tx
			.select({ id: schema.user.id })
			.from(schema.user)
			.where(eq(schema.user.username, candidate));
		if (!row) return candidate;
	}
	return `${base} ${crypto.randomUUID().slice(0, 8)}`;
}

/** Find or create the user for a verified Google account. Links the sole legacy account on first sign-in. */
export async function signInGoogleUser(profile: GoogleProfile) {
	return db.transaction(async (tx) => {
		const [bySub] = await tx.select().from(schema.user).where(eq(schema.user.googleSub, profile.sub));
		if (bySub) {
			if (bySub.email !== profile.email) {
				const [clash] = await tx
					.select({ id: schema.user.id })
					.from(schema.user)
					.where(eq(schema.user.email, profile.email));
				if (!clash)
					await tx.update(schema.user).set({ email: profile.email }).where(eq(schema.user.id, bySub.id));
			}
			return { id: bySub.id, created: false };
		}

		const [byEmail] = await tx.select().from(schema.user).where(eq(schema.user.email, profile.email));
		if (byEmail) {
			await tx.update(schema.user).set({ googleSub: profile.sub }).where(eq(schema.user.id, byEmail.id));
			return { id: byEmail.id, created: false };
		}

		const existing = await tx
			.select({ id: schema.user.id, googleSub: schema.user.googleSub })
			.from(schema.user);
		if (existing.length === 1 && !existing[0].googleSub) {
			await tx
				.update(schema.user)
				.set({ email: profile.email, googleSub: profile.sub })
				.where(eq(schema.user.id, existing[0].id));
			return { id: existing[0].id, created: false };
		}

		const username = await uniqueDisplayName(tx, profile.name);
		const [created] = await tx
			.insert(schema.user)
			.values({ username, email: profile.email, googleSub: profile.sub })
			.returning();
		await tx.insert(schema.userPrefs).values({ userId: created.id });
		await tx.insert(schema.exercise).values(
			DEFAULT_EXERCISES.map(([name, muscleGroup, equipment]) => ({
				userId: created.id,
				name,
				muscleGroup,
				equipment
			}))
		);
		return { id: created.id, created: true };
	});
}

export async function createSession(userId: string) {
	const token = randomBytes(32).toString('base64url');
	const expiresAt = new Date(Date.now() + SESSION_TTL);
	await db.insert(schema.session).values({ id: hashToken(token), userId, expiresAt });
	return { token, expiresAt };
}

export async function validateSession(token: string) {
	const id = hashToken(token);
	const [row] = await db
		.select({ session: schema.session, user: schema.user })
		.from(schema.session)
		.innerJoin(schema.user, eq(schema.session.userId, schema.user.id))
		.where(eq(schema.session.id, id));
	if (!row) return null;

	const now = Date.now();
	if (row.session.expiresAt.getTime() <= now) {
		await db.delete(schema.session).where(eq(schema.session.id, id));
		return null;
	}

	let expiresAt = row.session.expiresAt;
	if (expiresAt.getTime() - now < SESSION_TTL / 2) {
		expiresAt = new Date(now + SESSION_TTL);
		await db.update(schema.session).set({ expiresAt }).where(eq(schema.session.id, id));
	}
	return {
		user: { id: row.user.id, username: row.user.username, email: row.user.email ?? '' },
		expiresAt
	};
}

export async function invalidateSession(token: string) {
	await db.delete(schema.session).where(eq(schema.session.id, hashToken(token)));
}

export function setSessionCookie(cookies: Cookies, token: string, expiresAt: Date, secure: boolean) {
	cookies.set(SESSION_COOKIE, token, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure,
		expires: expiresAt
	});
}

export function clearSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: '/' });
}

const failures = new Map<string, { count: number; first: number }>();
const WINDOW = 15 * 60 * 1000;

export function isRateLimited(key: string) {
	const f = failures.get(key);
	if (!f) return false;
	if (Date.now() - f.first > WINDOW) {
		failures.delete(key);
		return false;
	}
	return f.count >= 10;
}

export function recordFailure(key: string) {
	const f = failures.get(key);
	if (!f || Date.now() - f.first > WINDOW) failures.set(key, { count: 1, first: Date.now() });
	else f.count++;
}

export function clearFailures(key: string) {
	failures.delete(key);
}
