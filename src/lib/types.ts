export type HitLogData = { exerciseId?: string; exerciseName?: string };

export type SetType = 'normal' | 'warmup' | 'failure';

export type SetView = {
	id: string;
	position: number;
	type: SetType;
	weightKg: number | null;
	reps: number | null;
	completed: boolean;
};

export type HitLogView = {
	id: string;
	position: number;
	weightKg: number | null;
	reps: number | null;
	durationSec: number | null;
	restSec: number | null;
	data: HitLogData;
	completed: boolean;
};

export type HitView = { id: string; methodKey: string; notes: string | null; logs: HitLogView[] };

export type Session = {
	workoutExerciseId: string;
	workoutId: string;
	workoutName: string;
	date: string;
	rating: number | null;
	cableHeight: string | null;
	seatHeight: string | null;
	repRange: string | null;
	notes: string | null;
	sets: SetView[];
	hits: HitView[];
	topWeightKg: number | null;
	totalReps: number;
	volumeKg: number;
	bestE1rmKg: number | null;
};

export type WorkoutExerciseState = {
	id: string;
	exerciseId: string;
	name: string;
	muscleGroup: string;
	equipment: string;
	position: number;
	cableHeight: string | null;
	seatHeight: string | null;
	repRange: string | null;
	rating: number | null;
	notes: string | null;
	exerciseNotes: string | null;
	restSec: number | null;
	sets: SetView[];
	hits: HitView[];
	previous: { date: string; sets: SetView[]; hits: HitView[]; notes: string | null } | null;
};

export type WorkoutState = {
	id: string;
	name: string;
	notes: string | null;
	status: 'in_progress' | 'completed' | 'discarded';
	startedAt: string;
	finishedAt: string | null;
	version: number;
	restEndsAt: string | null;
	restTotalSec: number | null;
	restWeId: string | null;
	serverNow: string;
	exercises: WorkoutExerciseState[];
};
