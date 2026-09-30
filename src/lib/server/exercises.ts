import { and, asc, eq } from 'drizzle-orm';
import { db, schema } from './db';
import { DEFAULT_EXERCISES, EQUIPMENT, MUSCLE_GROUPS } from './db/default-exercises';
import { optNum, optStr, str } from './util';

/** Insert any default exercises the user is missing (by name). Safe to call on every load. */
export async function ensureDefaultExercises(userId: string) {
	const existing = await db
		.select({ name: schema.exercise.name })
		.from(schema.exercise)
		.where(eq(schema.exercise.userId, userId));
	const have = new Set(existing.map((e) => e.name));
	const missing = DEFAULT_EXERCISES.filter(([name]) => !have.has(name));
	if (!missing.length) return;
	await db.insert(schema.exercise).values(
		missing.map(([name, muscleGroup, equipment]) => ({
			userId,
			name,
			muscleGroup,
			equipment
		}))
	);
}

export async function listExercises(userId: string) {
	return db
		.select({
			id: schema.exercise.id,
			name: schema.exercise.name,
			muscleGroup: schema.exercise.muscleGroup,
			equipment: schema.exercise.equipment
		})
		.from(schema.exercise)
		.where(and(eq(schema.exercise.userId, userId), eq(schema.exercise.archived, false)))
		.orderBy(asc(schema.exercise.name));
}

export async function getOwnedExercise(userId: string, id: string) {
	const [ex] = await db
		.select()
		.from(schema.exercise)
		.where(and(eq(schema.exercise.id, id), eq(schema.exercise.userId, userId)));
	return ex ?? null;
}

export function parseExerciseForm(form: FormData) {
	const name = str(form, 'name');
	const muscleGroup = str(form, 'muscleGroup');
	const equipment = str(form, 'equipment');
	const restSec = optNum(form, 'restSec');
	if (!name) return { error: 'Name is required.' } as const;
	if (!MUSCLE_GROUPS.includes(muscleGroup)) return { error: 'Pick a muscle group.' } as const;
	if (!EQUIPMENT.includes(equipment)) return { error: 'Pick equipment.' } as const;
	return {
		values: {
			name: name.slice(0, 80),
			muscleGroup,
			equipment,
			notes: optStr(form, 'notes'),
			restSec: restSec != null ? Math.max(0, Math.min(900, Math.round(restSec))) : null
		}
	} as const;
}

export { EQUIPMENT, MUSCLE_GROUPS };
