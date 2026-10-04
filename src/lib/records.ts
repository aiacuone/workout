import { setSummary } from './format';
import type { SetView } from './types';
import { e1rm, kgToDisplay, type WeightUnit } from './units';

export type Delta = 'up' | 'down';

export type Trend = {
	volume: Delta | null;
	weight: Delta | null;
};

export type RecordKind = 'weight' | 'e1rm' | 'reps' | 'set';

export type PersonalRecord = {
	exerciseId: string;
	exerciseName: string;
	kind: RecordKind;
	weightKg: number | null;
	reps: number | null;
};

export type PriorBests = {
	topWeightKg: number | null;
	bestE1rmKg: number | null;
	maxReps: number | null;
	bestSetVolumeKg: number | null;
};

type Bests = PriorBests & {
	bestSetKg: number | null;
	bestSetReps: number | null;
	volumeKg: number;
};

const EPS = 0.05;

export const RECORD_LABEL: Record<RecordKind, string> = {
	weight: 'Heaviest weight',
	e1rm: 'Estimated 1RM',
	reps: 'Most reps',
	set: 'Best set'
};

function gt(a: number, b: number) {
	return a > b + EPS;
}

export function compareNumber(current: number, previous: number): Delta | null {
	if (current > previous + EPS) return 'up';
	if (current < previous - EPS) return 'down';
	return null;
}

/** Compare top weight, including bodyweight (null) against a loaded previous session. */
export function compareWeight(current: number | null, previous: number | null): Delta | null {
	if (current == null && previous == null) return null;
	if (current == null) return 'down';
	if (previous == null) return 'up';
	return compareNumber(current, previous);
}

export function bestsFromSets(sets: SetView[]): Bests {
	const work = sets.filter((s) => s.completed && s.type !== 'warmup');
	let topWeightKg: number | null = null;
	let bestE1rmKg: number | null = null;
	let maxReps: number | null = null;
	let bestSetVolumeKg: number | null = null;
	let bestSetKg: number | null = null;
	let bestSetReps: number | null = null;
	let volumeKg = 0;

	for (const s of work) {
		const w = s.weightKg;
		const r = s.reps;
		if (w != null && r != null) volumeKg += w * r;
		if (w != null && (topWeightKg == null || w > topWeightKg)) topWeightKg = w;
		if (r != null && r > 0 && (maxReps == null || r > maxReps)) maxReps = r;
		if (w != null && r != null && r > 0) {
			const est = e1rm(w, r);
			if (bestE1rmKg == null || est > bestE1rmKg) bestE1rmKg = est;
			const vol = w * r;
			if (bestSetVolumeKg == null || vol > bestSetVolumeKg) {
				bestSetVolumeKg = vol;
				bestSetKg = w;
				bestSetReps = r;
			}
		}
	}

	return { topWeightKg, bestE1rmKg, maxReps, bestSetVolumeKg, bestSetKg, bestSetReps, volumeKg };
}

export function recordsAgainst(
	exerciseName: string,
	exerciseId: string,
	sets: SetView[],
	prior: PriorBests | null
): PersonalRecord[] {
	const current = bestsFromSets(sets);
	const out: PersonalRecord[] = [];
	const first = prior == null;

	if (
		current.topWeightKg != null &&
		(first || prior.topWeightKg == null || gt(current.topWeightKg, prior.topWeightKg))
	) {
		out.push({ exerciseId, exerciseName, kind: 'weight', weightKg: current.topWeightKg, reps: null });
	}
	if (
		current.bestE1rmKg != null &&
		(first || prior.bestE1rmKg == null || gt(current.bestE1rmKg, prior.bestE1rmKg))
	) {
		out.push({ exerciseId, exerciseName, kind: 'e1rm', weightKg: current.bestE1rmKg, reps: null });
	}
	if (current.maxReps != null && (first || prior.maxReps == null || current.maxReps > prior.maxReps)) {
		out.push({ exerciseId, exerciseName, kind: 'reps', weightKg: null, reps: current.maxReps });
	}
	if (
		current.bestSetVolumeKg != null &&
		current.bestSetVolumeKg > 0 &&
		(first || prior.bestSetVolumeKg == null || gt(current.bestSetVolumeKg, prior.bestSetVolumeKg))
	) {
		out.push({
			exerciseId,
			exerciseName,
			kind: 'set',
			weightKg: current.bestSetKg,
			reps: current.bestSetReps
		});
	}
	return out;
}

export function recordDetail(record: PersonalRecord, unit: WeightUnit) {
	if (record.kind === 'reps') return `${record.reps} reps`;
	if (record.kind === 'set') return setSummary({ weightKg: record.weightKg, reps: record.reps }, unit);
	if (record.weightKg != null) return `${kgToDisplay(record.weightKg, unit)} ${unit}`;
	return '';
}

export function recordsHeadline(count: number) {
	if (count === 0) return 'No personal records';
	if (count === 1) return '1 personal record';
	return `${count} personal records`;
}

export type TrendStats = { volumeKg: number; topWeightKg: number | null };

export function trendAgainst(current: TrendStats, previous: TrendStats | null): Trend {
	if (!previous) return { volume: null, weight: null };
	return {
		volume: compareNumber(current.volumeKg, previous.volumeKg),
		weight: compareWeight(current.topWeightKg, previous.topWeightKg)
	};
}
