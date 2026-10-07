import { and, asc, desc, eq, inArray } from 'drizzle-orm';
import { db, schema } from './db';
import { loadSetsAndHits } from './history';

export async function getOwnedRoutine(userId: string, id: string) {
	const [r] = await db
		.select()
		.from(schema.routine)
		.where(and(eq(schema.routine.id, id), eq(schema.routine.userId, userId)));
	return r ?? null;
}

type Executor = Pick<typeof db, 'select'>;

/** Pass the transaction when called inside one: embedded PGlite blocks other queries until it commits. */
export async function routineItems(routineIds: string[], exec: Executor = db) {
	if (!routineIds.length) return [];
	return exec
		.select({
			id: schema.routineExercise.id,
			routineId: schema.routineExercise.routineId,
			exerciseId: schema.routineExercise.exerciseId,
			position: schema.routineExercise.position,
			targetSets: schema.routineExercise.targetSets,
			repRange: schema.routineExercise.repRange,
			targetWeightKg: schema.routineExercise.targetWeightKg,
			cableHeight: schema.routineExercise.cableHeight,
			seatHeight: schema.routineExercise.seatHeight,
			hitMethods: schema.routineExercise.hitMethods,
			name: schema.exercise.name,
			muscleGroup: schema.exercise.muscleGroup,
			equipment: schema.exercise.equipment
		})
		.from(schema.routineExercise)
		.innerJoin(schema.exercise, eq(schema.exercise.id, schema.routineExercise.exerciseId))
		.where(inArray(schema.routineExercise.routineId, routineIds))
		.orderBy(asc(schema.routineExercise.position));
}

/** Most recent cable/seat values for each exercise, from completed or in-progress workouts. */
export async function latestExerciseSetup(userId: string, exerciseIds: string[]) {
	const ids = [...new Set(exerciseIds)];
	if (!ids.length) return new Map<string, { cableHeight: string | null; seatHeight: string | null }>();
	const rows = await db
		.selectDistinctOn([schema.workoutExercise.exerciseId], {
			exerciseId: schema.workoutExercise.exerciseId,
			cableHeight: schema.workoutExercise.cableHeight,
			seatHeight: schema.workoutExercise.seatHeight
		})
		.from(schema.workoutExercise)
		.innerJoin(schema.workout, eq(schema.workout.id, schema.workoutExercise.workoutId))
		.where(
			and(
				eq(schema.workout.userId, userId),
				inArray(schema.workout.status, ['completed', 'in_progress']),
				inArray(schema.workoutExercise.exerciseId, ids)
			)
		)
		.orderBy(asc(schema.workoutExercise.exerciseId), desc(schema.workout.startedAt));
	return new Map(rows.map((row) => [row.exerciseId, row]));
}

export function withKnownSetup<T extends { exerciseId: string; cableHeight: string | null; seatHeight: string | null }>(
	items: T[],
	setups: Map<string, { cableHeight: string | null; seatHeight: string | null }>
) {
	return items.map((it) => {
		const last = setups.get(it.exerciseId);
		return {
			...it,
			cableHeight: it.cableHeight ?? last?.cableHeight ?? null,
			seatHeight: it.seatHeight ?? last?.seatHeight ?? null
		};
	});
}

export async function listRoutines(userId: string) {
	const routines = await db
		.select()
		.from(schema.routine)
		.where(eq(schema.routine.userId, userId))
		.orderBy(asc(schema.routine.name));
	const items = await routineItems(routines.map((r) => r.id));
	return routines.map((r) => ({
		id: r.id,
		name: r.name,
		notes: r.notes,
		exercises: items.filter((i) => i.routineId === r.id).map((i) => ({ name: i.name, sets: i.targetSets }))
	}));
}

/**
 * For each distinct completed workout name, take the most recent session and
 * turn it into a routine (skips names that already have a routine).
 */
export async function createRoutinesFromLatestWorkouts(userId: string) {
	const completed = await db
		.select({
			id: schema.workout.id,
			name: schema.workout.name,
			startedAt: schema.workout.startedAt
		})
		.from(schema.workout)
		.where(and(eq(schema.workout.userId, userId), eq(schema.workout.status, 'completed')))
		.orderBy(desc(schema.workout.startedAt));

	const latestByName = new Map<string, string>(); // name → workout id
	for (const w of completed) {
		const key = w.name.trim();
		if (!key || latestByName.has(key)) continue;
		latestByName.set(key, w.id);
	}

	const existing = await db
		.select({ name: schema.routine.name })
		.from(schema.routine)
		.where(eq(schema.routine.userId, userId));
	const existingNames = new Set(existing.map((r) => r.name.trim().toLowerCase()));

	const result = { created: 0, skippedExisting: 0, skippedEmpty: 0 };

	for (const [name, workoutId] of latestByName) {
		if (existingNames.has(name.toLowerCase())) {
			result.skippedExisting++;
			continue;
		}

		const rows = await db
			.select({
				weId: schema.workoutExercise.id,
				exerciseId: schema.workoutExercise.exerciseId,
				position: schema.workoutExercise.position,
				repRange: schema.workoutExercise.repRange,
				cableHeight: schema.workoutExercise.cableHeight,
				seatHeight: schema.workoutExercise.seatHeight
			})
			.from(schema.workoutExercise)
			.where(eq(schema.workoutExercise.workoutId, workoutId))
			.orderBy(asc(schema.workoutExercise.position));

		if (!rows.length) {
			result.skippedEmpty++;
			continue;
		}

		const { sets } = await loadSetsAndHits(rows.map((r) => r.weId));

		const [r] = await db
			.insert(schema.routine)
			.values({ userId, name })
			.returning({ id: schema.routine.id });

		await db.insert(schema.routineExercise).values(
			rows.map((row, i) => {
				const all = sets.get(row.weId) ?? [];
				const work = all.filter((s) => s.type !== 'warmup');
				const working = work.length ? work : all;
				return {
					routineId: r.id,
					exerciseId: row.exerciseId,
					position: i,
					targetSets: Math.max(1, working.length),
					repRange: row.repRange,
					targetWeightKg: working.at(-1)?.weightKg ?? working.at(0)?.weightKg ?? null,
					cableHeight: row.cableHeight,
					seatHeight: row.seatHeight
				};
			})
		);

		existingNames.add(name.toLowerCase());
		result.created++;
	}

	return result;
}
