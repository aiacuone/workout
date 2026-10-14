import { error, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { summarize } from '$lib/server/history';
import { HIT_BY_KEY, type HitField } from '$lib/hit';
import { compareNumber, type TrendSide } from '$lib/records';
import { listExercises } from '$lib/server/exercises';
import { previousSessionStats, previousWorkoutVolume, trendsForExercises, workoutRecords } from '$lib/server/prs';
import { getPrefs, optNum, optStr, requireUser, str } from '$lib/server/util';
import { getOwnedWorkout, getWorkoutState } from '$lib/server/workouts';
import { displayToKg } from '$lib/units';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireUser(locals);
	const workout = await getWorkoutState(user.id, params.id, { withPrevious: false });
	if (!workout) error(404, 'Workout not found');
	if (workout.status === 'in_progress') redirect(303, '/workout/active');
	const startedAt = new Date(workout.startedAt);
	const exerciseIds = [...new Set(workout.exercises.map((e) => e.exerciseId))];
	const [records, prior, previousVolumeKg, exercises] = await Promise.all([
		workoutRecords(user.id, startedAt, workout.exercises),
		previousSessionStats(user.id, exerciseIds, startedAt),
		previousWorkoutVolume(user.id, startedAt),
		listExercises(user.id)
	]);
	const totals = workout.exercises.reduce(
		(t, e) => {
			const s = summarize(e.sets);
			return {
				volumeKg: t.volumeKg + s.volumeKg,
				reps: t.reps + s.totalReps,
				sets: t.sets + e.sets.filter((set) => set.type !== 'warmup').length
			};
		},
		{ volumeKg: 0, reps: 0, sets: 0 }
	);
	let volumeTrend: TrendSide | null = null;
	if (previousVolumeKg != null) {
		const direction = compareNumber(totals.volumeKg, previousVolumeKg);
		if (direction) volumeTrend = { direction, deltaKg: totals.volumeKg - previousVolumeKg };
	}
	return {
		workout,
		records,
		trends: trendsForExercises(workout.exercises, prior),
		totals,
		volumeTrend,
		exercises
	};
};

async function owned(locals: App.Locals, id: string) {
	const user = requireUser(locals);
	const w = await getOwnedWorkout(user.id, id);
	if (!w) error(404, 'Workout not found');
	return { user, w };
}

export const actions: Actions = {
	rate: async ({ locals, params, request }) => {
		const { w } = await owned(locals, params.id);
		const form = await request.formData();
		const r = optNum(form, 'rating');
		await db
			.update(schema.workoutExercise)
			.set({ rating: r && r >= 1 && r <= 3 ? Math.round(r) : null })
			.where(and(eq(schema.workoutExercise.id, str(form, 'weId')), eq(schema.workoutExercise.workoutId, w.id)));
	},

	note: async ({ locals, params, request }) => {
		const { w } = await owned(locals, params.id);
		const form = await request.formData();
		await db
			.update(schema.workoutExercise)
			.set({ notes: optStr(form, 'notes')?.slice(0, 2000) ?? null })
			.where(and(eq(schema.workoutExercise.id, str(form, 'weId')), eq(schema.workoutExercise.workoutId, w.id)));
	},

	permanentNote: async ({ locals, params, request }) => {
		const { user, w } = await owned(locals, params.id);
		const form = await request.formData();
		const exerciseId = str(form, 'exerciseId');
		const [row] = await db
			.select({ id: schema.workoutExercise.id })
			.from(schema.workoutExercise)
			.innerJoin(schema.exercise, eq(schema.exercise.id, schema.workoutExercise.exerciseId))
			.where(
				and(
					eq(schema.workoutExercise.workoutId, w.id),
					eq(schema.workoutExercise.exerciseId, exerciseId),
					eq(schema.exercise.userId, user.id)
				)
			)
			.limit(1);
		if (!row) error(404, 'Exercise not found');
		await db
			.update(schema.exercise)
			.set({ notes: optStr(form, 'notes')?.slice(0, 2000) ?? null })
			.where(and(eq(schema.exercise.id, exerciseId), eq(schema.exercise.userId, user.id)));
	},

	set: async ({ locals, params, request }) => {
		const { user, w } = await owned(locals, params.id);
		const form = await request.formData();
		const setId = str(form, 'setId');
		const [row] = await db
			.select({ id: schema.setLog.id })
			.from(schema.setLog)
			.innerJoin(schema.workoutExercise, eq(schema.workoutExercise.id, schema.setLog.workoutExerciseId))
			.where(and(eq(schema.setLog.id, setId), eq(schema.workoutExercise.workoutId, w.id)));
		if (!row) error(404, 'Set not found');
		const prefs = await getPrefs(user.id);
		const weightKg = displayToKg(str(form, 'weight'), prefs.weightUnit);
		const reps = optNum(form, 'reps');
		await db
			.update(schema.setLog)
			.set({
				weightKg: weightKg == null ? null : Math.min(2000, Math.max(0, weightKg)),
				reps: reps == null ? null : Math.min(1000, Math.max(0, Math.round(reps)))
			})
			.where(eq(schema.setLog.id, setId));
	},

	hitLog: async ({ locals, params, request }) => {
		const { user, w } = await owned(locals, params.id);
		const form = await request.formData();
		const logId = str(form, 'logId');
		const field = str(form, 'field') as HitField;
		const [row] = await db
			.select({ methodKey: schema.hitApplication.methodKey })
			.from(schema.hitLog)
			.innerJoin(schema.hitApplication, eq(schema.hitApplication.id, schema.hitLog.hitApplicationId))
			.innerJoin(schema.workoutExercise, eq(schema.workoutExercise.id, schema.hitApplication.workoutExerciseId))
			.where(and(eq(schema.hitLog.id, logId), eq(schema.workoutExercise.workoutId, w.id)))
			.limit(1);
		if (!row) error(404, 'HIT entry not found');
		const method = HIT_BY_KEY[row.methodKey];
		if (!method?.fields.includes(field)) error(400, 'Invalid HIT field');

		const raw = optStr(form, 'value');
		if (field === 'exercise') {
			if (!raw) {
				await db.update(schema.hitLog).set({ data: {} }).where(eq(schema.hitLog.id, logId));
				return;
			}
			const [exercise] = await db
				.select({ id: schema.exercise.id, name: schema.exercise.name })
				.from(schema.exercise)
				.where(and(eq(schema.exercise.id, raw), eq(schema.exercise.userId, user.id)))
				.limit(1);
			if (!exercise) error(404, 'Exercise not found');
			await db.update(schema.hitLog).set({ data: { exerciseId: exercise.id, exerciseName: exercise.name } }).where(eq(schema.hitLog.id, logId));
			return;
		}

		const number = raw == null ? null : Number(raw);
		if (number != null && (!Number.isFinite(number) || number < 0)) error(400, 'Invalid HIT value');
		if (field === 'weight') {
			await db.update(schema.hitLog).set({ weightKg: number == null ? null : Math.min(2000, number) }).where(eq(schema.hitLog.id, logId));
		} else {
			const value = number == null ? null : Math.min(3600, Math.round(number));
			const patch =
				field === 'reps'
					? { reps: value }
					: field === 'duration'
						? { durationSec: value }
						: { restSec: value };
			await db.update(schema.hitLog).set(patch).where(eq(schema.hitLog.id, logId));
		}
	},

	setup: async ({ locals, params, request }) => {
		const { w } = await owned(locals, params.id);
		const form = await request.formData();
		const set: { cableHeight?: string | null; seatHeight?: string | null; support?: string | null } = {};
		if (form.has('cableHeight')) set.cableHeight = optStr(form, 'cableHeight')?.slice(0, 20) ?? null;
		if (form.has('seatHeight')) set.seatHeight = optStr(form, 'seatHeight')?.slice(0, 20) ?? null;
		if (form.has('support')) set.support = optStr(form, 'support')?.slice(0, 20) ?? null;
		if (!Object.keys(set).length) return;
		await db
			.update(schema.workoutExercise)
			.set(set)
			.where(and(eq(schema.workoutExercise.id, str(form, 'weId')), eq(schema.workoutExercise.workoutId, w.id)));
	},

	saveRoutine: async ({ locals, params }) => {
		const { user, w } = await owned(locals, params.id);
		const state = await getWorkoutState(user.id, w.id, { withPrevious: false });
		if (!state) error(404);
		const [r] = await db
			.insert(schema.routine)
			.values({ userId: user.id, name: state.name })
			.returning({ id: schema.routine.id });
		if (state.exercises.length) {
			await db.insert(schema.routineExercise).values(
				state.exercises.map((e, i) => {
					const work = e.sets.filter((s) => s.type !== 'warmup');
					return {
						routineId: r.id,
						exerciseId: e.exerciseId,
						position: i,
						targetSets: Math.max(1, work.length || e.sets.length),
						repRange: e.repRange,
						targetWeightKg: work.at(0)?.weightKg ?? null,
						cableHeight: e.cableHeight,
						seatHeight: e.seatHeight,
						support: e.support
					};
				})
			);
		}
		redirect(303, `/routines/${r.id}`);
	},

	delete: async ({ locals, params }) => {
		const { w } = await owned(locals, params.id);
		await db.delete(schema.workout).where(eq(schema.workout.id, w.id));
		redirect(303, '/history');
	}
};
