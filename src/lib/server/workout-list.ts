import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db, schema } from './db';
import { loadSetsAndHits, summarize } from './history';

export async function listCompletedWorkouts(userId: string, limit = 100) {
	const workouts = await db
		.select()
		.from(schema.workout)
		.where(and(eq(schema.workout.userId, userId), eq(schema.workout.status, 'completed')))
		.orderBy(desc(schema.workout.startedAt))
		.limit(limit);
	if (!workouts.length) return [];

	const wes = await db
		.select({
			id: schema.workoutExercise.id,
			workoutId: schema.workoutExercise.workoutId,
			exerciseId: schema.workoutExercise.exerciseId,
			rating: schema.workoutExercise.rating,
			name: schema.exercise.name
		})
		.from(schema.workoutExercise)
		.innerJoin(schema.exercise, eq(schema.exercise.id, schema.workoutExercise.exerciseId))
		.where(
			inArray(
				schema.workoutExercise.workoutId,
				workouts.map((w) => w.id)
			)
		)
		.orderBy(asc(schema.workoutExercise.position));

	const { sets, hits } = await loadSetsAndHits(wes.map((w) => w.id));

	return workouts.map((w) => {
		const items = wes
			.filter((x) => x.workoutId === w.id)
			.map((x) => {
				const s = sets.get(x.id) ?? [];
				const best = s
					.filter((v) => v.completed && v.type !== 'warmup')
					.sort((a, b) => (b.weightKg ?? 0) - (a.weightKg ?? 0) || (b.reps ?? 0) - (a.reps ?? 0))[0];
				return {
					exerciseId: x.exerciseId,
					name: x.name,
					rating: x.rating,
					sets: s.filter((v) => v.type !== 'warmup').length,
					best: best ? { weightKg: best.weightKg, reps: best.reps } : null,
					hits: (hits.get(x.id) ?? []).map((h) => h.methodKey),
					volumeKg: summarize(s).volumeKg
				};
			});
		return {
			id: w.id,
			name: w.name,
			startedAt: w.startedAt.toISOString(),
			finishedAt: w.finishedAt?.toISOString() ?? null,
			durationSec: w.finishedAt ? Math.round((w.finishedAt.getTime() - w.startedAt.getTime()) / 1000) : null,
			volumeKg: items.reduce((n, i) => n + i.volumeKg, 0),
			exercises: items
		};
	});
}

export type WorkoutSummary = Awaited<ReturnType<typeof listCompletedWorkouts>>[number];
