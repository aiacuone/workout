import { and, asc, desc, eq, inArray, ne } from 'drizzle-orm';
import type { HitLogView, HitView, Session, SetView } from '$lib/types';
import { e1rm } from '$lib/units';
import { db, schema } from './db';

export async function loadSetsAndHits(workoutExerciseIds: string[]) {
	const sets = new Map<string, SetView[]>();
	const hits = new Map<string, HitView[]>();
	if (!workoutExerciseIds.length) return { sets, hits };

	const [setRows, hitRows] = await Promise.all([
		db
			.select()
			.from(schema.setLog)
			.where(inArray(schema.setLog.workoutExerciseId, workoutExerciseIds))
			.orderBy(asc(schema.setLog.position)),
		db
			.select()
			.from(schema.hitApplication)
			.where(inArray(schema.hitApplication.workoutExerciseId, workoutExerciseIds))
			.orderBy(asc(schema.hitApplication.position))
	]);

	const logRows = hitRows.length
		? await db
				.select()
				.from(schema.hitLog)
				.where(
					inArray(
						schema.hitLog.hitApplicationId,
						hitRows.map((h) => h.id)
					)
				)
				.orderBy(asc(schema.hitLog.position))
		: [];

	for (const s of setRows) {
		const list = sets.get(s.workoutExerciseId) ?? [];
		list.push({
			id: s.id,
			position: s.position,
			type: s.type,
			weightKg: s.weightKg,
			reps: s.reps,
			completed: s.completed
		});
		sets.set(s.workoutExerciseId, list);
	}

	const logsByHit = new Map<string, HitLogView[]>();
	for (const l of logRows) {
		const list = logsByHit.get(l.hitApplicationId) ?? [];
		list.push({
			id: l.id,
			position: l.position,
			weightKg: l.weightKg,
			reps: l.reps,
			durationSec: l.durationSec,
			restSec: l.restSec,
			data: l.data ?? {},
			completed: l.completed
		});
		logsByHit.set(l.hitApplicationId, list);
	}

	for (const h of hitRows) {
		const list = hits.get(h.workoutExerciseId) ?? [];
		list.push({ id: h.id, methodKey: h.methodKey, notes: h.notes, logs: logsByHit.get(h.id) ?? [] });
		hits.set(h.workoutExerciseId, list);
	}

	return { sets, hits };
}

export function summarize(sets: SetView[]) {
	const work = sets.filter((s) => s.completed && s.type !== 'warmup');
	let top: number | null = null;
	let best: number | null = null;
	let reps = 0;
	let volume = 0;
	for (const s of work) {
		const w = s.weightKg ?? 0;
		const r = s.reps ?? 0;
		reps += r;
		volume += w * r;
		if (s.weightKg != null && (top == null || w > top)) top = w;
		if (r > 0 && s.weightKg != null) {
			const est = e1rm(w, r);
			if (best == null || est > best) best = est;
		}
	}
	return { topWeightKg: top, totalReps: reps, volumeKg: volume, bestE1rmKg: best };
}

export async function exerciseHistory(
	userId: string,
	exerciseId: string,
	opts: { excludeWorkoutId?: string; limit?: number } = {}
): Promise<Session[]> {
	const conditions = [
		eq(schema.workoutExercise.exerciseId, exerciseId),
		eq(schema.workout.userId, userId),
		eq(schema.workout.status, 'completed')
	];
	if (opts.excludeWorkoutId) conditions.push(ne(schema.workout.id, opts.excludeWorkoutId));

	const rows = await db
		.select({ we: schema.workoutExercise, w: schema.workout })
		.from(schema.workoutExercise)
		.innerJoin(schema.workout, eq(schema.workout.id, schema.workoutExercise.workoutId))
		.where(and(...conditions))
		.orderBy(desc(schema.workout.startedAt), asc(schema.workoutExercise.position))
		.limit(opts.limit ?? 200);

	const { sets, hits } = await loadSetsAndHits(rows.map((r) => r.we.id));

	return rows.map(({ we, w }) => {
		const s = sets.get(we.id) ?? [];
		return {
			workoutExerciseId: we.id,
			workoutId: w.id,
			workoutName: w.name,
			date: w.startedAt.toISOString(),
			rating: we.rating,
			cableHeight: we.cableHeight,
			seatHeight: we.seatHeight,
			repRange: we.repRange,
			notes: we.notes,
			sets: s,
			hits: hits.get(we.id) ?? [],
			...summarize(s)
		};
	});
}
