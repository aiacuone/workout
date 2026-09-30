import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { Cookies } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db, schema } from './db';
import { DEFAULT_EXERCISES } from './db/default-exercises';

const scryptAsync = promisify(scrypt) as (
	password: string,
	salt: Buffer,
	keylen: number,
	opts: { N: number; r: number; p: number; maxmem: number }
) => Promise<Buffer>;

const SCRYPT = { N: 2 ** 15, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };
const DAY = 24 * 60 * 60 * 1000;
const SESSION_TTL = 60 * DAY;

export const SESSION_COOKIE = 'session';

export async function hashPassword(password: string) {
	const salt = randomBytes(16);
	const hash = await scryptAsync(password.normalize('NFKC'), salt, 64, SCRYPT);
	return `scrypt$${salt.toString('base64')}$${hash.toString('base64')}`;
}

export async function verifyPassword(password: string, stored: string) {
	const [algo, saltB64, hashB64] = stored.split('$');
	if (algo !== 'scrypt' || !saltB64 || !hashB64) return false;
	const expected = Buffer.from(hashB64, 'base64');
	const actual = await scryptAsync(
		password.normalize('NFKC'),
		Buffer.from(saltB64, 'base64'),
		expected.length,
		SCRYPT
	);
	return timingSafeEqual(expected, actual);
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export async function hasAnyUser() {
	const rows = await db.select({ id: schema.user.id }).from(schema.user).limit(1);
	return rows.length > 0;
}

export async function createOwner(username: string, password: string) {
	return db.transaction(async (tx) => {
		const existing = await tx.select({ id: schema.user.id }).from(schema.user).limit(1);
		if (existing.length) throw new Error('An account already exists');

		const [owner] = await tx
			.insert(schema.user)
			.values({ username, passwordHash: await hashPassword(password) })
			.returning();
		await tx.insert(schema.userPrefs).values({ userId: owner.id });
		await tx.insert(schema.exercise).values(
			DEFAULT_EXERCISES.map(([name, muscleGroup, equipment]) => ({
				userId: owner.id,
				name,
				muscleGroup,
				equipment
			}))
		);
		return owner;
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
	return { user: { id: row.user.id, username: row.user.username }, expiresAt };
}

export async function invalidateSession(token: string) {
	await db.delete(schema.session).where(eq(schema.session.id, hashToken(token)));
}

export async function invalidateUserSessions(userId: string, exceptToken?: string) {
	const sessions = await db
		.select({ id: schema.session.id })
		.from(schema.session)
		.where(eq(schema.session.userId, userId));
	const keep = exceptToken ? hashToken(exceptToken) : null;
	for (const s of sessions) {
		if (s.id !== keep) await db.delete(schema.session).where(eq(schema.session.id, s.id));
	}
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
