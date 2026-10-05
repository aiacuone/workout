import { and, asc, desc, eq, inArray, lt, max, ne, sql } from 'drizzle-orm';
import {
	bestsFromSets,
	recordsAgainst,
	trendAgainst,
	type PersonalRecord,
	type PriorBests,
	type Trend,
	type TrendStats
} from '$lib/records';
import type { SetView } from '$lib/types';
import { db, schema } from './db';
import { loadSetsAndHits, summarize } from './history';

function num(value: unknown): number | null {
	if (value == null) return null;
	const n = typeof value === 'number' ? value : Number(value);
	return Number.isFinite(n) ? n : null;
}

/** All-time bests for each exercise from completed workouts before `before`. */
export async function priorBests(
	userId: string,
	exerciseIds: string[],
	before: Date
): Promise<Map<string, PriorBests>> {
	const map = new Map<string, PriorBests>();
	if (!exerciseIds.length) return map;

	const rows = await db
		.select({
			exerciseId: schema.workoutExercise.exerciseId,
			topWeightKg: max(schema.setLog.weightKg),
			maxReps: max(schema.setLog.reps),
			bestSetVolumeKg: sql<number | null>`max(${schema.setLog.weightKg} * ${schema.setLog.reps})`,
			bestE1rmKg: sql<number | null>`max(case
				when ${schema.setLog.reps} is null or ${schema.setLog.reps} <= 0 or ${schema.setLog.weightKg} is null then null
				when ${schema.setLog.reps} = 1 then ${schema.setLog.weightKg}
				else ${schema.setLog.weightKg} * (1.0 + ${schema.setLog.reps} / 30.0)
			end)`
		})
		.from(schema.setLog)
		.innerJoin(schema.workoutExercise, eq(schema.setLog.workoutExerciseId, schema.workoutExercise.id))
		.innerJoin(schema.workout, eq(schema.workout.id, schema.workoutExercise.workoutId))
		.where(
			and(
				eq(schema.workout.userId, userId),
				eq(schema.workout.status, 'completed'),
				lt(schema.workout.startedAt, before),
				inArray(schema.workoutExercise.exerciseId, exerciseIds),
				eq(schema.setLog.completed, true),
				ne(schema.setLog.type, 'warmup')
			)
		)
		.groupBy(schema.workoutExercise.exerciseId);

	for (const row of rows) {
		map.set(row.exerciseId, {
			topWeightKg: num(row.topWeightKg),
			bestE1rmKg: num(row.bestE1rmKg),
			maxReps: row.maxReps == null ? null : Number(row.maxReps),
			bestSetVolumeKg: num(row.bestSetVolumeKg)
		});
	}
	return map;
}

/** Total work volume of the completed workout immediately before `before`, or null if there isn't one. */
export async function previousWorkoutVolume(userId: string, before: Date): Promise<number | null> {
	const [prev] = await db
		.select({ id: schema.workout.id })
		.from(schema.workout)
		.where(
			and(
				eq(schema.workout.userId, userId),
				eq(schema.workout.status, 'completed'),
				lt(schema.workout.startedAt, before)
			)
		)
		.orderBy(desc(schema.workout.startedAt))
		.limit(1);
	if (!prev) return null;

	const rows = await db
		.select({ id: schema.workoutExercise.id })
		.from(schema.workoutExercise)
		.where(eq(schema.workoutExercise.workoutId, prev.id));
	if (!rows.length) return 0;

	const { sets } = await loadSetsAndHits(rows.map((row) => row.id));
	return rows.reduce((total, row) => total + summarize(sets.get(row.id) ?? []).volumeKg, 0);
}

/** Volume and top weight from the latest completed session of each exercise before `before`. */
export async function previousSessionStats(
	userId: string,
	exerciseIds: string[],
	before: Date
): Promise<Map<string, TrendStats>> {
	const map = new Map<string, TrendStats>();
	if (!exerciseIds.length) return map;

	const rows = await db
		.selectDistinctOn([schema.workoutExercise.exerciseId], {
			exerciseId: schema.workoutExercise.exerciseId,
			weId: schema.workoutExercise.id
		})
		.from(schema.workoutExercise)
		.innerJoin(schema.workout, eq(schema.workout.id, schema.workoutExercise.workoutId))
		.where(
			and(
				eq(schema.workout.userId, userId),
				eq(schema.workout.status, 'completed'),
				lt(schema.workout.startedAt, before),
				inArray(schema.workoutExercise.exerciseId, exerciseIds)
			)
		)
		.orderBy(
			asc(schema.workoutExercise.exerciseId),
			desc(schema.workout.startedAt),
			desc(schema.workoutExercise.position)
		);

	const { sets } = await loadSetsAndHits(rows.map((row) => row.weId));
	for (const row of rows) {
		const best = bestsFromSets(sets.get(row.weId) ?? []);
		map.set(row.exerciseId, { volumeKg: best.volumeKg, topWeightKg: best.topWeightKg });
	}
	return map;
}

export async function workoutRecords(
	userId: string,
	startedAt: Date,
	exercises: { exerciseId: string; name: string; sets: SetView[] }[]
): Promise<PersonalRecord[]> {
	const order: string[] = [];
	const merged = new Map<string, { name: string; sets: SetView[] }>();
	for (const exercise of exercises) {
		const existing = merged.get(exercise.exerciseId);
		if (existing) existing.sets = existing.sets.concat(exercise.sets);
		else {
			order.push(exercise.exerciseId);
			merged.set(exercise.exerciseId, { name: exercise.name, sets: exercise.sets });
		}
	}

	const prior = await priorBests(userId, order, startedAt);
	const records: PersonalRecord[] = [];
	for (const exerciseId of order) {
		const exercise = merged.get(exerciseId)!;
		records.push(
			...recordsAgainst(exercise.name, exerciseId, exercise.sets, prior.get(exerciseId) ?? null)
		);
	}
	return records;
}

export function trendsForExercises(
	exercises: { id: string; exerciseId: string; sets: SetView[] }[],
	prior: Map<string, TrendStats>
): Record<string, Trend> {
	const last = new Map(prior);
	const trends: Record<string, Trend> = {};
	for (const exercise of exercises) {
		const best = bestsFromSets(exercise.sets);
		const current = { volumeKg: best.volumeKg, topWeightKg: best.topWeightKg };
		trends[exercise.id] = trendAgainst(current, last.get(exercise.exerciseId) ?? null);
		last.set(exercise.exerciseId, current);
	}
	return trends;
}
