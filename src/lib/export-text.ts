import { hitMethod } from './hit';
import { GIRTH_KEYS, totalGirthCm } from './measurements';
import { ratingLabel } from './format';
import { cmToDisplay, formatDuration, kgToDisplay, type LengthUnit, type WeightUnit } from './units';

export type MeasurementExportRow = {
	measuredOn: string;
	weightKg: number | null;
	calories: number | null;
	bodyFatPct: number | null;
	heightCm: number | null;
	notes: string | null;
} & Partial<Record<(typeof GIRTH_KEYS)[number], number | null>>;

const GIRTH_LABELS: Record<(typeof GIRTH_KEYS)[number], string> = {
	neckCm: 'Neck',
	shouldersCm: 'Shoulders',
	chestCm: 'Chest',
	bicepLCm: 'Bicep L',
	bicepRCm: 'Bicep R',
	waistCm: 'Waist',
	hipsCm: 'Hips',
	thighLCm: 'Thigh L',
	thighRCm: 'Thigh R',
	calfLCm: 'Calf L',
	calfRCm: 'Calf R'
};

export type HistoryExportWorkout = {
	name: string;
	startedAt: string;
	finishedAt: string | null;
	notes: string | null;
	exercises: {
		name: string;
		muscleGroup: string;
		equipment: string;
		rating: number | null;
		repRange: string | null;
		cableHeight: string | null;
		seatHeight: string | null;
		notes: string | null;
		sets: { type: string; weightKg: number | null; reps: number | null; completed: boolean }[];
		hits: {
			methodKey: string;
			notes: string | null;
			logs: {
				weightKg: number | null;
				reps: number | null;
				durationSec: number | null;
				restSec: number | null;
				completed: boolean;
				exerciseName: string | null;
			}[];
		}[];
	}[];
};

function cell(value: string | number | null | undefined) {
	if (value == null || value === '') return '';
	const text = String(value);
	if (/[\t\n\r"]/.test(text)) return `"${text.replaceAll('"', '""')}"`;
	return text;
}

function toTsv(rows: (string | number | null | undefined)[][]) {
	return rows.map((row) => row.map(cell).join('\t')).join('\n');
}

function localParts(iso: string) {
	const d = new Date(iso);
	const pad = (n: number) => String(n).padStart(2, '0');
	return {
		date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
		time: `${pad(d.getHours())}:${pad(d.getMinutes())}`
	};
}

function weightCell(kg: number | null, unit: WeightUnit) {
	return kg == null ? '' : kgToDisplay(kg, unit);
}

function lengthCell(cm: number | null | undefined, unit: LengthUnit) {
	return cm == null ? '' : cmToDisplay(cm, unit);
}

export function measurementsTsv(entries: MeasurementExportRow[], weight: WeightUnit, length: LengthUnit) {
	const header = [
		'Date',
		`Weight (${weight})`,
		'Calories (kcal)',
		'Body fat %',
		`Height (${length})`,
		...GIRTH_KEYS.map((key) => `${GIRTH_LABELS[key]} (${length})`),
		`Total (${length})`,
		'Notes'
	];
	const rows = entries.map((entry) => [
		entry.measuredOn,
		weightCell(entry.weightKg, weight),
		entry.calories ?? '',
		entry.bodyFatPct ?? '',
		lengthCell(entry.heightCm, length),
		...GIRTH_KEYS.map((key) => lengthCell(entry[key], length)),
		lengthCell(totalGirthCm(entry), length),
		entry.notes ?? ''
	]);
	return toTsv([header, ...rows]);
}

function setEntry(type: string, workNumber: number) {
	if (type === 'warmup') return 'Warmup';
	if (type === 'failure') return 'Failure';
	return `Set ${workNumber}`;
}

export function workoutsTsv(workouts: HistoryExportWorkout[], weight: WeightUnit) {
	const header = [
		'Date',
		'Time',
		'Workout time',
		'Workout',
		'Workout notes',
		'Exercise',
		'Muscle group',
		'Equipment',
		'Rating',
		'Rep range',
		'Cable height',
		'Seat height',
		'Exercise notes',
		'Kind',
		'Entry',
		`Weight (${weight})`,
		'Reps',
		'Seconds',
		'Rest (s)',
		'Done',
		'Detail'
	];
	const rows: (string | number | null | undefined)[][] = [];

	for (const workout of workouts) {
		const when = localParts(workout.startedAt);
		const duration =
			workout.finishedAt == null
				? ''
				: formatDuration((new Date(workout.finishedAt).getTime() - new Date(workout.startedAt).getTime()) / 1000);
		const base = [
			when.date,
			when.time,
			duration,
			workout.name,
			workout.notes ?? '',
		];

		if (!workout.exercises.length) {
			rows.push([...base, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
			continue;
		}

		for (const exercise of workout.exercises) {
			const exerciseBase = [
				...base,
				exercise.name,
				exercise.muscleGroup,
				exercise.equipment,
				ratingLabel(exercise.rating),
				exercise.repRange ?? '',
				exercise.cableHeight ?? '',
				exercise.seatHeight ?? '',
				exercise.notes ?? ''
			];
			let workNumber = 0;
			const lines: (string | number | null | undefined)[][] = [];

			for (const set of exercise.sets) {
				if (set.type !== 'warmup') workNumber += 1;
				lines.push([
					...exerciseBase,
					'Set',
					setEntry(set.type, workNumber),
					weightCell(set.weightKg, weight),
					set.reps ?? '',
					'',
					'',
					set.completed ? 'yes' : 'no',
					''
				]);
			}

			for (const hit of exercise.hits) {
				const method = hitMethod(hit.methodKey);
				hit.logs.forEach((log, index) => {
					const detail = [log.exerciseName, hit.notes].filter(Boolean).join(' · ');
					lines.push([
						...exerciseBase,
						method.name,
						`${method.entryLabel} ${index + 1}`,
						weightCell(log.weightKg, weight),
						log.reps ?? '',
						log.durationSec ?? '',
						log.restSec ?? '',
						log.completed ? 'yes' : 'no',
						detail
					]);
				});
			}

			rows.push(...(lines.length ? lines : [[...exerciseBase, '', '', '', '', '', '', '', '']]));
		}
	}

	return toTsv([header, ...rows]);
}
