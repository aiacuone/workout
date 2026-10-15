import { measurements, workoutFromRoutine, workoutHistory, type PreviewWorkout } from './data';
import { hitMethod } from '$lib/hit';

type PreviewMeasurement = { date: string; weight: number };

export const previewSession = $state<{
	active: PreviewWorkout | null;
	history: PreviewWorkout[];
	measurements: PreviewMeasurement[];
}>({
	active: null,
	history: structuredClone(workoutHistory),
	measurements: structuredClone(measurements)
});

export function startPreviewWorkout(routineId = 'push') {
	previewSession.active = workoutFromRoutine(routineId);
}

export function finishPreviewWorkout() {
	if (!previewSession.active) return;
	const workout = previewSession.active;
	const started = new Date(workout.startedAt).getTime();
	workout.durationSec = Math.max(60, Math.round((Date.now() - started) / 1000));
	workout.volumeKg = workout.exercises.reduce(
		(total, exercise) =>
			total +
			exercise.sets.reduce(
				(sum, set) => sum + (set.completed ? Number(set.weight) * Number(set.reps) : 0),
				0
			) +
			exercise.hits.reduce(
				(sum, hit) =>
					sum +
					hit.logs.reduce(
						(logTotal, log) => logTotal + (log.completed ? Number(log.weight) * Number(log.reps) : 0),
						0
					),
				0
			),
		0
	);
	previewSession.history.unshift(structuredClone(workout));
	previewSession.active = null;
}

export function addPreviewWeight(weight: number) {
	if (!Number.isFinite(weight) || weight <= 0) return;
	previewSession.measurements.push({
		date: new Date().toISOString().slice(0, 10),
		weight
	});
}

export function addPreviewHit(exerciseId: string, methodKey: string) {
	const exercise = previewSession.active?.exercises.find((item) => item.id === exerciseId);
	if (!exercise || exercise.hits.some((hit) => hit.methodKey === methodKey)) return;
	const method = hitMethod(methodKey);
	const id = `${exerciseId}-${methodKey}-${Date.now()}`;
	exercise.hits.push({
		id,
		methodKey,
		logs: [
			{
				id: `${id}-1`,
				weight: exercise.sets.at(-1)?.weight ?? 0,
				reps: 6,
				duration: methodKey === 'negatives' ? 4 : methodKey === 'isometric' ? 20 : 0,
				rest: method.defaultRest ?? 0,
				exerciseId: '',
				completed: false
			}
		]
	});
}

export function addPreviewHitLog(exerciseId: string, hitId: string) {
	const hit = previewSession.active?.exercises
		.find((item) => item.id === exerciseId)
		?.hits.find((item) => item.id === hitId);
	if (!hit) return;
	const previous = hit.logs.at(-1);
	hit.logs.push({
		id: `${hit.id}-${hit.logs.length + 1}`,
		weight: previous?.weight ?? 0,
		reps: previous?.reps ?? 0,
		duration: previous?.duration ?? 0,
		rest: previous?.rest ?? 0,
		exerciseId: previous?.exerciseId ?? '',
		completed: false
	});
}

export function removePreviewHit(exerciseId: string, hitId: string) {
	const exercise = previewSession.active?.exercises.find((item) => item.id === exerciseId);
	if (!exercise) return;
	exercise.hits = exercise.hits.filter((hit) => hit.id !== hitId);
}
