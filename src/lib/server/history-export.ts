import { and, asc, eq, inArray } from 'drizzle-orm';
import type { HistoryExportWorkout } from '$lib/export-text';
import { db, schema } from './db';
import { loadSetsAndHits } from './history';

export async function loadHistoryExport(userId: string): Promise<HistoryExportWorkout[]> {
	const workouts = await db
		.select()
		.from(schema.workout)
		.where(and(eq(schema.workout.userId, userId), eq(schema.workout.status, 'completed')))
		.orderBy(asc(schema.workout.startedAt));
	if (!workouts.length) return [];

	const wes = await db
		.select({
			we: schema.workoutExercise,
			name: schema.exercise.name,
			muscleGroup: schema.exercise.muscleGroup,
			equipment: schema.exercise.equipment
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

	const { sets, hits } = await loadSetsAndHits(wes.map((row) => row.we.id));

	return workouts.map((workout) => ({
		name: workout.name,
		startedAt: workout.startedAt.toISOString(),
		finishedAt: workout.finishedAt?.toISOString() ?? null,
		notes: workout.notes,
		exercises: wes
			.filter((row) => row.we.workoutId === workout.id)
			.map((row) => ({
				name: row.name,
				muscleGroup: row.muscleGroup,
				equipment: row.equipment,
				rating: row.we.rating,
				repRange: row.we.repRange,
				cableHeight: row.we.cableHeight,
				seatHeight: row.we.seatHeight,
				support: row.we.support,
				notes: row.we.notes,
				sets: (sets.get(row.we.id) ?? []).map((set) => ({
					type: set.type,
					weightKg: set.weightKg,
					reps: set.reps,
					completed: set.completed
				})),
				hits: (hits.get(row.we.id) ?? []).map((hit) => ({
					methodKey: hit.methodKey,
					notes: hit.notes,
					logs: hit.logs.map((log) => ({
						weightKg: log.weightKg,
						reps: log.reps,
						durationSec: log.durationSec,
						restSec: log.restSec,
						completed: log.completed,
						exerciseName: log.data?.exerciseName ?? null
					}))
				}))
			}))
	}));
}
