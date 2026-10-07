import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { trendAgainst, type Trend, type TrendStats } from '$lib/records';
import { db, schema } from './db';
import { loadSetsAndHits, summarize } from './history';
import { previousSessionStats } from './prs';

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

	const summaries = workouts.map((w) => {
		const items = wes
			.filter((x) => x.workoutId === w.id)
			.map((x) => {
				const s = sets.get(x.id) ?? [];
				const summary = summarize(s);
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
					volumeKg: summary.volumeKg,
					topWeightKg: summary.topWeightKg,
					totalReps: summary.totalReps,
					trend: { volume: null, weight: null, reps: null } as Trend
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

	await attachTrends(userId, summaries);
	return summaries;
}

async function attachTrends(
	userId: string,
	workouts: {
		startedAt: string;
		exercises: {
			exerciseId: string;
			volumeKg: number;
			topWeightKg: number | null;
			totalReps: number;
			trend: Trend;
		}[];
	}[]
) {
	const chronological = [...workouts].sort((a, b) => +new Date(a.startedAt) - +new Date(b.startedAt));
	const oldest = chronological[0];
	if (!oldest) return;

	const exerciseIds = [...new Set(chronological.flatMap((w) => w.exercises.map((e) => e.exerciseId)))];
	const prior = await previousSessionStats(userId, exerciseIds, new Date(oldest.startedAt));
	const last = new Map<string, TrendStats>(prior);

	for (const workout of chronological) {
		for (const exercise of workout.exercises) {
			const current = {
				volumeKg: exercise.volumeKg,
				topWeightKg: exercise.topWeightKg,
				totalReps: exercise.totalReps
			};
			exercise.trend = trendAgainst(current, last.get(exercise.exerciseId) ?? null);
			last.set(exercise.exerciseId, current);
		}
	}
}

export type WorkoutSummary = Awaited<ReturnType<typeof listCompletedWorkouts>>[number];
