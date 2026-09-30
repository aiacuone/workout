import { and, desc, eq, isNotNull } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { listRoutines } from '$lib/server/routines';
import { requireUser } from '$lib/server/util';
import { listCompletedWorkouts } from '$lib/server/workout-list';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	const [recent, routines, [latestBf], [latestWeight]] = await Promise.all([
		listCompletedWorkouts(user.id, 60),
		listRoutines(user.id),
		db
			.select({
				measuredOn: schema.bodyMeasurement.measuredOn,
				bodyFatPct: schema.bodyMeasurement.bodyFatPct
			})
			.from(schema.bodyMeasurement)
			.where(and(eq(schema.bodyMeasurement.userId, user.id), isNotNull(schema.bodyMeasurement.bodyFatPct)))
			.orderBy(desc(schema.bodyMeasurement.measuredOn), desc(schema.bodyMeasurement.createdAt))
			.limit(1),
		db
			.select({
				measuredOn: schema.bodyMeasurement.measuredOn,
				weightKg: schema.bodyMeasurement.weightKg
			})
			.from(schema.bodyMeasurement)
			.where(and(eq(schema.bodyMeasurement.userId, user.id), isNotNull(schema.bodyMeasurement.weightKg)))
			.orderBy(desc(schema.bodyMeasurement.measuredOn), desc(schema.bodyMeasurement.createdAt))
			.limit(1)
	]);

	const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
	const days = new Set(recent.map((w) => w.startedAt.slice(0, 10)));
	const weeks: number[] = [];
	for (let i = 7; i >= 0; i--) {
		const end = Date.now() - i * 7 * 24 * 3600 * 1000;
		const start = end - 7 * 24 * 3600 * 1000;
		weeks.push(recent.filter((w) => +new Date(w.startedAt) > start && +new Date(w.startedAt) <= end).length);
	}

	return {
		recent: recent.slice(0, 3),
		routines: routines.slice(0, 4),
		latestBf: latestBf ?? null,
		latestWeight: latestWeight ?? null,
		stats: {
			thisWeek: recent.filter((w) => +new Date(w.startedAt) > weekAgo).length,
			total: recent.length,
			days: days.size,
			weeks
		}
	};
};
