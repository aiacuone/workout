import { error, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { summarize } from '$lib/server/history';
import { compareNumber, type TrendSide } from '$lib/records';
import { previousSessionStats, previousWorkoutVolume, trendsForExercises, workoutRecords } from '$lib/server/prs';
import { optNum, optStr, requireUser, str } from '$lib/server/util';
import { getOwnedWorkout, getWorkoutState } from '$lib/server/workouts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, params }) => {
	const user = requireUser(locals);
	const workout = await getWorkoutState(user.id, params.id, { withPrevious: false });
	if (!workout) error(404, 'Workout not found');
	if (workout.status === 'in_progress') redirect(303, '/workout/active');
	const startedAt = new Date(workout.startedAt);
	const exerciseIds = [...new Set(workout.exercises.map((e) => e.exerciseId))];
	const [records, prior, previousVolumeKg] = await Promise.all([
		workoutRecords(user.id, startedAt, workout.exercises),
		previousSessionStats(user.id, exerciseIds, startedAt),
		previousWorkoutVolume(user.id, startedAt)
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
		volumeTrend
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

	setup: async ({ locals, params, request }) => {
		const { w } = await owned(locals, params.id);
		const form = await request.formData();
		const set: { cableHeight?: string | null; seatHeight?: string | null } = {};
		if (form.has('cableHeight')) set.cableHeight = optStr(form, 'cableHeight')?.slice(0, 20) ?? null;
		if (form.has('seatHeight')) set.seatHeight = optStr(form, 'seatHeight')?.slice(0, 20) ?? null;
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
						seatHeight: e.seatHeight
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
