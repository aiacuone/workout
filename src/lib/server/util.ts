import { error } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db, schema } from './db';

export function requireUser(locals: App.Locals) {
	if (!locals.user) error(401, 'Not signed in');
	return locals.user;
}

export async function getPrefs(userId: string) {
	const [prefs] = await db
		.select()
		.from(schema.userPrefs)
		.where(eq(schema.userPrefs.userId, userId));
	if (prefs) return prefs;
	const [created] = await db.insert(schema.userPrefs).values({ userId }).returning();
	return created;
}

export async function getActiveWorkout(userId: string) {
	const [w] = await db
		.select({
			id: schema.workout.id,
			name: schema.workout.name,
			startedAt: schema.workout.startedAt
		})
		.from(schema.workout)
		.where(and(eq(schema.workout.userId, userId), eq(schema.workout.status, 'in_progress')))
		.limit(1);
	return w ?? null;
}

export function str(form: FormData, key: string) {
	const v = form.get(key);
	return typeof v === 'string' ? v.trim() : '';
}

export function optStr(form: FormData, key: string) {
	return str(form, key) || null;
}

export function optNum(form: FormData, key: string) {
	const s = str(form, key).replace(',', '.');
	if (!s) return null;
	const n = Number(s);
	return Number.isFinite(n) ? n : null;
}
