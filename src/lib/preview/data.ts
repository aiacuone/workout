export type PreviewSet = {
	id: string;
	weight: number;
	reps: number;
	completed: boolean;
};

export type PreviewHitLog = {
	id: string;
	weight: number;
	reps: number;
	duration: number;
	rest: number;
	exerciseId: string;
	completed: boolean;
};

export type PreviewHit = {
	id: string;
	methodKey: string;
	logs: PreviewHitLog[];
};

export type PreviewWorkoutExercise = {
	id: string;
	name: string;
	sets: PreviewSet[];
	hits: PreviewHit[];
};

export type PreviewWorkout = {
	id: string;
	name: string;
	startedAt: string;
	durationSec: number;
	volumeKg: number;
	exercises: PreviewWorkoutExercise[];
};

export const exercises = [
	{ id: 'bench', name: 'Bench Press', muscleGroup: 'Chest', note: 'Retract shoulder blades and keep feet planted.' },
	{ id: 'incline', name: 'Incline Dumbbell Press', muscleGroup: 'Chest', note: 'Use a low incline and control the descent.' },
	{ id: 'row', name: 'Chest-Supported Row', muscleGroup: 'Back', note: 'Pull elbows toward the hips.' },
	{ id: 'pulldown', name: 'Lat Pulldown', muscleGroup: 'Back', note: 'Drive elbows down without swinging.' },
	{ id: 'squat', name: 'Back Squat', muscleGroup: 'Legs', note: 'Brace before every rep.' },
	{ id: 'rdl', name: 'Romanian Deadlift', muscleGroup: 'Legs', note: 'Keep the bar close and hips back.' },
	{ id: 'raise', name: 'Lateral Raise', muscleGroup: 'Shoulders', note: 'Lead with the elbows.' },
	{ id: 'curl', name: 'Cable Curl', muscleGroup: 'Arms', note: 'Keep upper arms still.' }
] as const;

export const routines = [
	{
		id: 'push',
		name: 'Push Strength',
		exercises: [
			{ id: 'bench', name: 'Bench Press', sets: 3, hitMethod: 'drop_set' },
			{ id: 'incline', name: 'Incline Dumbbell Press', sets: 3 },
			{ id: 'raise', name: 'Lateral Raise', sets: 3 }
		]
	},
	{
		id: 'pull',
		name: 'Pull & Posterior',
		exercises: [
			{ id: 'row', name: 'Chest-Supported Row', sets: 3 },
			{ id: 'pulldown', name: 'Lat Pulldown', sets: 3 },
			{ id: 'rdl', name: 'Romanian Deadlift', sets: 3 }
		]
	}
] as const;

export const workoutHistory: PreviewWorkout[] = [
	{
		id: 'push',
		name: 'Push Strength',
		startedAt: '2026-10-13T06:35:00+11:00',
		durationSec: 3120,
		volumeKg: 4872,
		exercises: [
			{
				id: 'bench',
				name: 'Bench Press',
				sets: [
					{ id: 'b1', weight: 82.5, reps: 8, completed: true },
					{ id: 'b2', weight: 82.5, reps: 8, completed: true },
					{ id: 'b3', weight: 82.5, reps: 7, completed: true }
				],
				hits: [
					{
						id: 'bench-drop',
						methodKey: 'drop_set',
						logs: [
							{ id: 'bench-drop-1', weight: 62.5, reps: 10, duration: 0, rest: 0, exerciseId: '', completed: true },
							{ id: 'bench-drop-2', weight: 45, reps: 12, duration: 0, rest: 0, exerciseId: '', completed: true }
						]
					}
				]
			},
			{
				id: 'incline',
				name: 'Incline Dumbbell Press',
				sets: [
					{ id: 'i1', weight: 30, reps: 10, completed: true },
					{ id: 'i2', weight: 30, reps: 9, completed: true },
					{ id: 'i3', weight: 28, reps: 11, completed: true }
				],
				hits: []
			},
			{
				id: 'raise',
				name: 'Lateral Raise',
				sets: [
					{ id: 'l1', weight: 10, reps: 14, completed: true },
					{ id: 'l2', weight: 10, reps: 13, completed: true },
					{ id: 'l3', weight: 10, reps: 12, completed: true }
				],
				hits: []
			}
		]
	},
	{
		id: 'legs',
		name: 'Lower Strength',
		startedAt: '2026-10-09T17:45:00+11:00',
		durationSec: 3540,
		volumeKg: 6340,
		exercises: [
			{
				id: 'squat',
				name: 'Back Squat',
				sets: [
					{ id: 's1', weight: 110, reps: 6, completed: true },
					{ id: 's2', weight: 110, reps: 6, completed: true },
					{ id: 's3', weight: 105, reps: 8, completed: true }
				],
				hits: []
			},
			{
				id: 'rdl',
				name: 'Romanian Deadlift',
				sets: [
					{ id: 'r1', weight: 100, reps: 8, completed: true },
					{ id: 'r2', weight: 100, reps: 8, completed: true },
					{ id: 'r3', weight: 95, reps: 10, completed: true }
				],
				hits: []
			}
		]
	}
];

export const measurements = [
	{ date: '2026-08-20', weight: 84.4 },
	{ date: '2026-09-03', weight: 83.9 },
	{ date: '2026-09-17', weight: 83.1 },
	{ date: '2026-10-01', weight: 82.7 },
	{ date: '2026-10-14', weight: 82.2 }
];

export const weeks = [2, 3, 2, 4, 3, 4, 3, 2];

export function workoutFromRoutine(id: string): PreviewWorkout {
	const routine = routines.find((item) => item.id === id) ?? routines[0];
	return {
		id: `preview-${routine.id}`,
		name: routine.name,
		startedAt: new Date().toISOString(),
		durationSec: 0,
		volumeKg: 0,
		exercises: routine.exercises.map((exercise) => ({
			id: exercise.id,
			name: exercise.name,
			sets: Array.from({ length: exercise.sets }, (_, index) => ({
				id: `${exercise.id}-${index}`,
				weight: exercise.id === 'bench' ? 80 : exercise.id === 'rdl' ? 95 : 24,
				reps: 8,
				completed: false
			})),
			hits:
				'hitMethod' in exercise
					? [
							{
								id: `${exercise.id}-${exercise.hitMethod}`,
								methodKey: exercise.hitMethod,
								logs: [
									{
										id: `${exercise.id}-${exercise.hitMethod}-1`,
										weight: 60,
										reps: 10,
										duration: 0,
										rest: 0,
										exerciseId: '',
										completed: false
									}
								]
							}
						]
					: []
		}))
	};
}
