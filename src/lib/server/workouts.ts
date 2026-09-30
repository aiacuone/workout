import { error } from '@sveltejs/kit';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { HIT_BY_KEY } from '$lib/hit';
import type { WorkoutExerciseState, WorkoutState } from '$lib/types';
import { db, schema } from './db';
import { exerciseHistory, loadSetsAndHits } from './history';
import { routineItems } from './routines';
import { getPrefs } from './util';

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function getOwnedWorkout(userId: string, id: string) {
	const [w] = await db
		.select()
		.from(schema.workout)
		.where(and(eq(schema.workout.id, id), eq(schema.workout.userId, userId)));
	return w ?? null;
}

async function workoutExercises(workoutId: string) {
	return db
		.select({
			we: schema.workoutExercise,
			name: schema.exercise.name,
			muscleGroup: schema.exercise.muscleGroup,
			equipment: schema.exercise.equipment,
			restSec: schema.exercise.restSec,
			exerciseNotes: schema.exercise.notes
		})
		.from(schema.workoutExercise)
		.innerJoin(schema.exercise, eq(schema.exercise.id, schema.workoutExercise.exerciseId))
		.where(eq(schema.workoutExercise.workoutId, workoutId))
		.orderBy(asc(schema.workoutExercise.position));
}

export async function getWorkoutState(
	userId: string,
	workoutId: string,
	opts: { withPrevious?: boolean } = {}
): Promise<WorkoutState | null> {
	const w = await getOwnedWorkout(userId, workoutId);
	if (!w) return null;

	const rows = await workoutExercises(w.id);
	const { sets, hits } = await loadSetsAndHits(rows.map((r) => r.we.id));

	const previous = new Map<string, WorkoutExerciseState['previous']>();
	if (opts.withPrevious ?? w.status === 'in_progress') {
		const ids = [...new Set(rows.map((r) => r.we.exerciseId))];
		await Promise.all(
			ids.map(async (exerciseId) => {
				const [last] = await exerciseHistory(userId, exerciseId, { excludeWorkoutId: w.id, limit: 1 });
				previous.set(exerciseId, last ? { date: last.date, sets: last.sets, hits: last.hits, notes: last.notes } : null);
			})
		);
	}

	return {
		id: w.id,
		name: w.name,
		notes: w.notes,
		status: w.status,
		startedAt: w.startedAt.toISOString(),
		finishedAt: w.finishedAt?.toISOString() ?? null,
		version: w.version,
		restEndsAt: w.restEndsAt?.toISOString() ?? null,
		restTotalSec: w.restTotalSec,
		serverNow: new Date().toISOString(),
		exercises: rows.map(({ we, name, muscleGroup, equipment, restSec, exerciseNotes }) => ({
			id: we.id,
			exerciseId: we.exerciseId,
			name,
			muscleGroup,
			equipment,
			position: we.position,
			cableHeight: we.cableHeight,
			seatHeight: we.seatHeight,
			repRange: we.repRange,
			rating: we.rating,
			notes: we.notes,
			exerciseNotes,
			restSec,
			sets: sets.get(we.id) ?? [],
			hits: hits.get(we.id) ?? [],
			previous: previous.get(we.exerciseId) ?? null
		}))
	};
}

/** Setup values (cable/seat height, rep range) carried over from the last time this exercise was done. */
async function lastSetup(tx: Tx, userId: string, exerciseId: string) {
	const [row] = await tx
		.select({
			cableHeight: schema.workoutExercise.cableHeight,
			seatHeight: schema.workoutExercise.seatHeight,
			repRange: schema.workoutExercise.repRange
		})
		.from(schema.workoutExercise)
		.innerJoin(schema.workout, eq(schema.workout.id, schema.workoutExercise.workoutId))
		.where(
			and(
				eq(schema.workoutExercise.exerciseId, exerciseId),
				eq(schema.workout.userId, userId),
				eq(schema.workout.status, 'completed')
			)
		)
		.orderBy(sql`${schema.workout.startedAt} desc`)
		.limit(1);
	return row ?? { cableHeight: null, seatHeight: null, repRange: null };
}

async function addExerciseTx(
	tx: Tx,
	userId: string,
	workoutId: string,
	exerciseId: string,
	opts: { sets?: number; repRange?: string | null; weightKg?: number | null } = {}
) {
	const [ex] = await tx
		.select({ id: schema.exercise.id })
		.from(schema.exercise)
		.where(and(eq(schema.exercise.id, exerciseId), eq(schema.exercise.userId, userId)));
	if (!ex) error(400, 'Unknown exercise');

	const [{ max }] = await tx
		.select({ max: sql<number>`coalesce(max(${schema.workoutExercise.position}), -1)` })
		.from(schema.workoutExercise)
		.where(eq(schema.workoutExercise.workoutId, workoutId));

	const setup = await lastSetup(tx, userId, exerciseId);
	const [we] = await tx
		.insert(schema.workoutExercise)
		.values({
			workoutId,
			exerciseId,
			position: Number(max) + 1,
			cableHeight: setup.cableHeight,
			seatHeight: setup.seatHeight,
			repRange: opts.repRange ?? setup.repRange
		})
		.returning({ id: schema.workoutExercise.id });

	const n = Math.max(1, opts.sets ?? 3);
	await tx.insert(schema.setLog).values(
		Array.from({ length: n }, (_, i) => ({
			workoutExerciseId: we.id,
			position: i,
			weightKg: opts.weightKg ?? null
		}))
	);
	return we.id;
}

export async function startWorkout(userId: string, routineId: string | null) {
	return db.transaction(async (tx) => {
		const [existing] = await tx
			.select({ id: schema.workout.id })
			.from(schema.workout)
			.where(and(eq(schema.workout.userId, userId), eq(schema.workout.status, 'in_progress')));
		if (existing) return existing.id;

		let name = 'Workout';
		let items: Awaited<ReturnType<typeof routineItems>> = [];
		if (routineId) {
			const [r] = await tx
				.select()
				.from(schema.routine)
				.where(and(eq(schema.routine.id, routineId), eq(schema.routine.userId, userId)));
			if (!r) error(404, 'Routine not found');
			name = r.name;
			items = await routineItems([r.id], tx);
		}

		const [w] = await tx
			.insert(schema.workout)
			.values({ userId, name, routineId: routineId ?? null })
			.returning({ id: schema.workout.id });

		for (const it of items) {
			await addExerciseTx(tx, userId, w.id, it.exerciseId, {
				sets: it.targetSets,
				repRange: it.repRange,
				weightKg: it.targetWeightKg
			});
		}
		return w.id;
	});
}

// ---------------------------------------------------------------------------
// Operations

type SetPatch = Partial<{
	weightKg: number | null;
	reps: number | null;
	completed: boolean;
	type: 'normal' | 'warmup' | 'failure';
}>;
type ExercisePatch = Partial<{
	cableHeight: string | null;
	seatHeight: string | null;
	repRange: string | null;
	rating: number | null;
	notes: string | null;
	exerciseNotes: string | null;
}>;
type HitLogPatch = Partial<{
	weightKg: number | null;
	reps: number | null;
	durationSec: number | null;
	restSec: number | null;
	completed: boolean;
	data: { exerciseId?: string; exerciseName?: string };
}>;

export type Op =
	| { op: 'rename'; name: string; notes?: string | null }
	| { op: 'addExercise'; exerciseId: string }
	| { op: 'removeExercise'; weId: string }
	| { op: 'moveExercise'; weId: string; dir: 'up' | 'down' }
	| { op: 'updateExercise'; weId: string; patch: ExercisePatch }
	| { op: 'addSet'; weId: string }
	| { op: 'removeSet'; setId: string }
	| { op: 'updateSet'; setId: string; patch: SetPatch }
	| { op: 'addHit'; weId: string; methodKey: string }
	| { op: 'removeHit'; hitId: string }
	| { op: 'updateHit'; hitId: string; notes: string | null }
	| { op: 'addHitLog'; hitId: string }
	| { op: 'removeHitLog'; logId: string }
	| { op: 'updateHitLog'; logId: string; patch: HitLogPatch }
	| { op: 'startRest'; seconds: number }
	| { op: 'adjustRest'; delta: number }
	| { op: 'stopRest' }
	| { op: 'finish' }
	| { op: 'discard' };

const num = (v: unknown, min: number, max: number, int = false) => {
	if (v === null || v === undefined || v === '') return null;
	const n = Number(v);
	if (!Number.isFinite(n)) return null;
	const c = Math.min(max, Math.max(min, n));
	return int ? Math.round(c) : c;
};
const text = (v: unknown, max = 40) =>
	typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null;

async function ownedWe(tx: Tx, workoutId: string, weId: string) {
	const [we] = await tx
		.select()
		.from(schema.workoutExercise)
		.where(and(eq(schema.workoutExercise.id, weId), eq(schema.workoutExercise.workoutId, workoutId)));
	if (!we) error(404, 'Exercise not in this workout');
	return we;
}

async function ownedSet(tx: Tx, workoutId: string, setId: string) {
	const [row] = await tx
		.select({ set: schema.setLog, we: schema.workoutExercise })
		.from(schema.setLog)
		.innerJoin(schema.workoutExercise, eq(schema.workoutExercise.id, schema.setLog.workoutExerciseId))
		.where(and(eq(schema.setLog.id, setId), eq(schema.workoutExercise.workoutId, workoutId)));
	if (!row) error(404, 'Set not in this workout');
	return row;
}

async function ownedHit(tx: Tx, workoutId: string, hitId: string) {
	const [row] = await tx
		.select({ hit: schema.hitApplication })
		.from(schema.hitApplication)
		.innerJoin(
			schema.workoutExercise,
			eq(schema.workoutExercise.id, schema.hitApplication.workoutExerciseId)
		)
		.where(and(eq(schema.hitApplication.id, hitId), eq(schema.workoutExercise.workoutId, workoutId)));
	if (!row) error(404, 'HIT method not in this workout');
	return row.hit;
}

async function ownedHitLog(tx: Tx, workoutId: string, logId: string) {
	const [row] = await tx
		.select({ log: schema.hitLog, hit: schema.hitApplication })
		.from(schema.hitLog)
		.innerJoin(schema.hitApplication, eq(schema.hitApplication.id, schema.hitLog.hitApplicationId))
		.innerJoin(
			schema.workoutExercise,
			eq(schema.workoutExercise.id, schema.hitApplication.workoutExerciseId)
		)
		.where(and(eq(schema.hitLog.id, logId), eq(schema.workoutExercise.workoutId, workoutId)));
	if (!row) error(404, 'HIT entry not in this workout');
	return row;
}

async function renumberSets(tx: Tx, weId: string) {
	const rows = await tx
		.select({ id: schema.setLog.id })
		.from(schema.setLog)
		.where(eq(schema.setLog.workoutExerciseId, weId))
		.orderBy(asc(schema.setLog.position));
	for (const [i, r] of rows.entries())
		await tx.update(schema.setLog).set({ position: i }).where(eq(schema.setLog.id, r.id));
}

async function renumberExercises(tx: Tx, workoutId: string) {
	const rows = await tx
		.select({ id: schema.workoutExercise.id })
		.from(schema.workoutExercise)
		.where(eq(schema.workoutExercise.workoutId, workoutId))
		.orderBy(asc(schema.workoutExercise.position));
	for (const [i, r] of rows.entries())
		await tx
			.update(schema.workoutExercise)
			.set({ position: i })
			.where(eq(schema.workoutExercise.id, r.id));
}

function restUntil(seconds: number) {
	return { restEndsAt: new Date(Date.now() + seconds * 1000), restTotalSec: seconds };
}

export type OpResult = { status: 'in_progress' | 'completed' | 'discarded' };

export async function applyOp(userId: string, workoutId: string, op: Op): Promise<OpResult> {
	const prefs = await getPrefs(userId);

	return db.transaction(async (tx) => {
		const [w] = await tx
			.select()
			.from(schema.workout)
			.where(and(eq(schema.workout.id, workoutId), eq(schema.workout.userId, userId)))
			.for('update');
		if (!w) error(404, 'Workout not found');
		if (w.status !== 'in_progress') error(409, 'Workout is no longer in progress');

		const bump: Partial<typeof schema.workout.$inferInsert> = {};

		switch (op.op) {
			case 'rename': {
				const name = text(op.name, 80);
				if (name) bump.name = name;
				if ('notes' in op) bump.notes = text(op.notes, 2000);
				break;
			}

			case 'addExercise':
				await addExerciseTx(tx, userId, w.id, op.exerciseId);
				break;

			case 'removeExercise':
				await ownedWe(tx, w.id, op.weId);
				await tx.delete(schema.workoutExercise).where(eq(schema.workoutExercise.id, op.weId));
				await renumberExercises(tx, w.id);
				break;

			case 'moveExercise': {
				const list = await tx
					.select({ id: schema.workoutExercise.id, position: schema.workoutExercise.position })
					.from(schema.workoutExercise)
					.where(eq(schema.workoutExercise.workoutId, w.id))
					.orderBy(asc(schema.workoutExercise.position));
				const i = list.findIndex((x) => x.id === op.weId);
				const j = i + (op.dir === 'up' ? -1 : 1);
				if (i < 0 || j < 0 || j >= list.length) break;
				await tx
					.update(schema.workoutExercise)
					.set({ position: j })
					.where(eq(schema.workoutExercise.id, list[i].id));
				await tx
					.update(schema.workoutExercise)
					.set({ position: i })
					.where(eq(schema.workoutExercise.id, list[j].id));
				break;
			}

			case 'updateExercise': {
				const weRow = await ownedWe(tx, w.id, op.weId);
				const p = op.patch ?? {};
				const set: Partial<typeof schema.workoutExercise.$inferInsert> = {};
				if ('cableHeight' in p) set.cableHeight = text(p.cableHeight, 20);
				if ('seatHeight' in p) set.seatHeight = text(p.seatHeight, 20);
				if ('repRange' in p) set.repRange = text(p.repRange, 20);
				if ('rating' in p) set.rating = num(p.rating, 1, 3, true);
				if ('notes' in p) set.notes = text(p.notes, 2000);
				if (Object.keys(set).length)
					await tx.update(schema.workoutExercise).set(set).where(eq(schema.workoutExercise.id, op.weId));
				if ('exerciseNotes' in p) {
					await tx
						.update(schema.exercise)
						.set({ notes: text(p.exerciseNotes, 2000) })
						.where(and(eq(schema.exercise.id, weRow.exerciseId), eq(schema.exercise.userId, userId)));
				}
				break;
			}

			case 'addSet': {
				await ownedWe(tx, w.id, op.weId);
				const existing = await tx
					.select()
					.from(schema.setLog)
					.where(eq(schema.setLog.workoutExerciseId, op.weId))
					.orderBy(asc(schema.setLog.position));
				const last = existing.at(-1);
				await tx.insert(schema.setLog).values({
					workoutExerciseId: op.weId,
					position: existing.length,
					weightKg: last?.weightKg ?? null,
					reps: last?.completed ? last.reps : null
				});
				break;
			}

			case 'removeSet': {
				const { set } = await ownedSet(tx, w.id, op.setId);
				await tx.delete(schema.setLog).where(eq(schema.setLog.id, set.id));
				await renumberSets(tx, set.workoutExerciseId);
				break;
			}

			case 'updateSet': {
				const { set, we } = await ownedSet(tx, w.id, op.setId);
				const p = op.patch ?? {};
				const next: Partial<typeof schema.setLog.$inferInsert> = {};
				if ('weightKg' in p) next.weightKg = num(p.weightKg, 0, 2000);
				if ('reps' in p) next.reps = num(p.reps, 0, 1000, true);
				if (p.type && ['normal', 'warmup', 'failure'].includes(p.type)) next.type = p.type;
				if ('completed' in p) {
					next.completed = !!p.completed;
					next.completedAt = p.completed ? new Date() : null;
					if (p.completed && !set.completed) {
						const [ex] = await tx
							.select({ restSec: schema.exercise.restSec })
							.from(schema.exercise)
							.where(eq(schema.exercise.id, we.exerciseId));
						const secs = ex?.restSec ?? prefs.defaultRestSec;
						if (secs > 0) Object.assign(bump, restUntil(secs));
					}
				}
				if (Object.keys(next).length)
					await tx.update(schema.setLog).set(next).where(eq(schema.setLog.id, set.id));
				break;
			}

			case 'addHit': {
				await ownedWe(tx, w.id, op.weId);
				if (!HIT_BY_KEY[op.methodKey]) error(400, 'Unknown HIT method');
				const apps = await tx
					.select({ methodKey: schema.hitApplication.methodKey })
					.from(schema.hitApplication)
					.where(eq(schema.hitApplication.workoutExerciseId, op.weId));
				if (apps.some((a) => a.methodKey === op.methodKey)) break;

				const lastSet = (
					await tx
						.select()
						.from(schema.setLog)
						.where(eq(schema.setLog.workoutExerciseId, op.weId))
						.orderBy(asc(schema.setLog.position))
				)
					.filter((s) => s.weightKg != null)
					.at(-1);

				const [hit] = await tx
					.insert(schema.hitApplication)
					.values({ workoutExerciseId: op.weId, methodKey: op.methodKey, position: apps.length })
					.returning({ id: schema.hitApplication.id });
				await tx.insert(schema.hitLog).values(defaultLog(op.methodKey, hit.id, 0, lastSet?.weightKg ?? null));
				break;
			}

			case 'removeHit':
				await ownedHit(tx, w.id, op.hitId);
				await tx.delete(schema.hitApplication).where(eq(schema.hitApplication.id, op.hitId));
				break;

			case 'updateHit':
				await ownedHit(tx, w.id, op.hitId);
				await tx
					.update(schema.hitApplication)
					.set({ notes: text(op.notes, 2000) })
					.where(eq(schema.hitApplication.id, op.hitId));
				break;

			case 'addHitLog': {
				const hit = await ownedHit(tx, w.id, op.hitId);
				const logs = await tx
					.select()
					.from(schema.hitLog)
					.where(eq(schema.hitLog.hitApplicationId, hit.id))
					.orderBy(asc(schema.hitLog.position));
				const last = logs.at(-1);
				const base = defaultLog(hit.methodKey, hit.id, logs.length, last?.weightKg ?? null);
				if (hit.methodKey === 'drop_set' && last?.weightKg != null)
					base.weightKg = Math.round(last.weightKg * 0.75 * 4) / 4;
				if (last && hit.methodKey === 'pre_exhaustion') base.data = last.data;
				await tx.insert(schema.hitLog).values(base);
				break;
			}

			case 'removeHitLog': {
				const { log } = await ownedHitLog(tx, w.id, op.logId);
				await tx.delete(schema.hitLog).where(eq(schema.hitLog.id, log.id));
				break;
			}

			case 'updateHitLog': {
				const { log, hit } = await ownedHitLog(tx, w.id, op.logId);
				const p = op.patch ?? {};
				const next: Partial<typeof schema.hitLog.$inferInsert> = {};
				if ('weightKg' in p) next.weightKg = num(p.weightKg, 0, 2000);
				if ('reps' in p) next.reps = num(p.reps, 0, 1000, true);
				if ('durationSec' in p) next.durationSec = num(p.durationSec, 0, 3600, true);
				if ('restSec' in p) next.restSec = num(p.restSec, 0, 600, true);
				if (p.data && typeof p.data === 'object') {
					next.data = {
						exerciseId: text(p.data.exerciseId, 64) ?? undefined,
						exerciseName: text(p.data.exerciseName, 80) ?? undefined
					};
				}
				if ('completed' in p) {
					next.completed = !!p.completed;
					next.completedAt = p.completed ? new Date() : null;
					const def = HIT_BY_KEY[hit.methodKey];
					if (p.completed && !log.completed && def?.defaultRest)
						Object.assign(bump, restUntil(def.defaultRest));
				}
				if (Object.keys(next).length)
					await tx.update(schema.hitLog).set(next).where(eq(schema.hitLog.id, log.id));
				break;
			}

			case 'startRest': {
				const s = num(op.seconds, 5, 900, true);
				if (s) Object.assign(bump, restUntil(s));
				break;
			}

			case 'adjustRest': {
				if (!w.restEndsAt) break;
				const ends = new Date(w.restEndsAt.getTime() + (num(op.delta, -600, 600, true) ?? 0) * 1000);
				if (ends.getTime() <= Date.now()) {
					bump.restEndsAt = null;
					bump.restTotalSec = null;
				} else {
					bump.restEndsAt = ends;
					bump.restTotalSec = Math.max(
						w.restTotalSec ?? 0,
						Math.round((ends.getTime() - Date.now()) / 1000)
					);
				}
				break;
			}

			case 'stopRest':
				bump.restEndsAt = null;
				bump.restTotalSec = null;
				break;

			case 'finish':
				return finishTx(tx, w.id);

			case 'discard':
				await tx.delete(schema.workout).where(eq(schema.workout.id, w.id));
				return { status: 'discarded' };

			default:
				error(400, 'Unknown operation');
		}

		await tx
			.update(schema.workout)
			.set({ ...bump, version: sql`${schema.workout.version} + 1`, updatedAt: new Date() })
			.where(eq(schema.workout.id, w.id));
		return { status: 'in_progress' };
	});
}

function defaultLog(methodKey: string, hitId: string, position: number, weightKg: number | null) {
	const def = HIT_BY_KEY[methodKey];
	return {
		hitApplicationId: hitId,
		position,
		weightKg: def?.fields.includes('weight') ? weightKg : null,
		restSec: def?.fields.includes('rest') ? (def.defaultRest ?? null) : null,
		data: {} as { exerciseId?: string; exerciseName?: string }
	};
}

async function finishTx(tx: Tx, workoutId: string): Promise<OpResult> {
	const wes = await tx
		.select({ id: schema.workoutExercise.id })
		.from(schema.workoutExercise)
		.where(eq(schema.workoutExercise.workoutId, workoutId));
	const weIds = wes.map((x) => x.id);

	if (weIds.length) {
		await tx
			.delete(schema.setLog)
			.where(and(inArray(schema.setLog.workoutExerciseId, weIds), eq(schema.setLog.completed, false)));

		const apps = await tx
			.select({ id: schema.hitApplication.id })
			.from(schema.hitApplication)
			.where(inArray(schema.hitApplication.workoutExerciseId, weIds));
		if (apps.length) {
			const appIds = apps.map((a) => a.id);
			await tx
				.delete(schema.hitLog)
				.where(and(inArray(schema.hitLog.hitApplicationId, appIds), eq(schema.hitLog.completed, false)));
			await tx
				.delete(schema.hitApplication)
				.where(
					and(
						inArray(schema.hitApplication.id, appIds),
						sql`not exists (select 1 from ${schema.hitLog} where ${schema.hitLog.hitApplicationId} = ${schema.hitApplication.id})`
					)
				);
		}

		await tx
			.delete(schema.workoutExercise)
			.where(
				and(
					eq(schema.workoutExercise.workoutId, workoutId),
					sql`not exists (select 1 from ${schema.setLog} where ${schema.setLog.workoutExerciseId} = ${schema.workoutExercise.id})`,
					sql`not exists (select 1 from ${schema.hitApplication} where ${schema.hitApplication.workoutExerciseId} = ${schema.workoutExercise.id})`
				)
			);
		await renumberExercises(tx, workoutId);
	}

	const [{ n }] = await tx
		.select({ n: sql<number>`count(*)` })
		.from(schema.workoutExercise)
		.where(eq(schema.workoutExercise.workoutId, workoutId));
	if (Number(n) === 0) error(400, 'Complete at least one set before finishing.');

	await tx
		.update(schema.workout)
		.set({
			status: 'completed',
			finishedAt: new Date(),
			restEndsAt: null,
			restTotalSec: null,
			version: sql`${schema.workout.version} + 1`,
			updatedAt: new Date()
		})
		.where(eq(schema.workout.id, workoutId));
	return { status: 'completed' };
}
