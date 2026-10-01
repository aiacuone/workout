import { and, eq } from 'drizzle-orm';
import { db, schema } from './db';

export type StrongImportResult = {
	workouts: number;
	sets: number;
	exercisesCreated: number;
	skipped: number;
	skippedExisting: number;
};

type Row = Record<string, string>;

function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let i = 0;
	let inQuotes = false;
	const s = text.replace(/^\uFEFF/, '');

	while (i < s.length) {
		const c = s[i];
		if (inQuotes) {
			if (c === '"') {
				if (s[i + 1] === '"') {
					cell += '"';
					i += 2;
					continue;
				}
				inQuotes = false;
				i++;
				continue;
			}
			cell += c;
			i++;
			continue;
		}
		if (c === '"') {
			inQuotes = true;
			i++;
			continue;
		}
		if (c === ',' || c === ';') {
			row.push(cell);
			cell = '';
			i++;
			continue;
		}
		if (c === '\n' || (c === '\r' && s[i + 1] === '\n')) {
			row.push(cell);
			cell = '';
			if (row.some((v) => v.trim() !== '')) rows.push(row);
			row = [];
			i += c === '\r' ? 2 : 1;
			continue;
		}
		if (c === '\r') {
			row.push(cell);
			cell = '';
			if (row.some((v) => v.trim() !== '')) rows.push(row);
			row = [];
			i++;
			continue;
		}
		cell += c;
		i++;
	}
	row.push(cell);
	if (row.some((v) => v.trim() !== '')) rows.push(row);
	return rows;
}

function headerKey(h: string) {
	return h.trim().toLowerCase().replace(/\s+/g, ' ');
}

function get(row: Row, ...names: string[]) {
	for (const n of names) {
		const v = row[headerKey(n)];
		if (v != null && v !== '') return v;
	}
	return '';
}

/** Strong Duration examples: "1h 23m", "45m", "2h", "1h 5m 30s" */
export function parseStrongDuration(raw: string): number | null {
	const s = raw.trim().toLowerCase();
	if (!s) return null;
	let sec = 0;
	let matched = false;
	const h = s.match(/(\d+)\s*h/);
	const m = s.match(/(\d+)\s*m(?!s)/);
	const secMatch = s.match(/(\d+)\s*s/);
	if (h) {
		sec += Number(h[1]) * 3600;
		matched = true;
	}
	if (m) {
		sec += Number(m[1]) * 60;
		matched = true;
	}
	if (secMatch) {
		sec += Number(secMatch[1]);
		matched = true;
	}
	return matched ? sec : null;
}

function parseDate(raw: string): Date | null {
	const s = raw.trim();
	if (!s) return null;
	// "2020-12-30 18:51:52" or ISO
	const normalized = s.includes('T') ? s : s.replace(' ', 'T');
	const d = new Date(normalized);
	return Number.isNaN(d.getTime()) ? null : d;
}

function parseNum(raw: string): number | null {
	const s = raw.trim().replace(',', '.');
	if (!s) return null;
	const n = Number(s);
	return Number.isFinite(n) ? n : null;
}

const EQUIP_SUFFIX =
	/\s*\((Barbell|Dumbbell|Cable|Machine|Smith Machine|Bodyweight|Kettlebell|Band|EZ Bar|Trap Bar)\)$/i;

/** Map common Strong names onto Strongr library names. */
const NAME_ALIASES: Record<string, string> = {
	'Squat (Barbell)': 'Back Squat',
	'Squat': 'Back Squat',
	'Front Squat (Barbell)': 'Front Squat',
	'Bench Press (Barbell)': 'Bench Press',
	'Incline Bench Press (Barbell)': 'Incline Bench Press',
	'Decline Bench Press (Barbell)': 'Decline Bench Press',
	'Deadlift (Barbell)': 'Deadlift',
	'Romanian Deadlift (Barbell)': 'Romanian Deadlift',
	'Overhead Press (Barbell)': 'Overhead Press',
	'Military Press (Barbell)': 'Overhead Press',
	'Barbell Row': 'Barbell Row',
	'Bent Over Row (Barbell)': 'Barbell Row',
	'Pull-Up': 'Pull Up',
	'Pull-Ups': 'Pull Up',
	'Chin-Up': 'Chin Up',
	'Chin-Ups': 'Chin Up',
	'Lat Pulldown (Cable)': 'Lat Pulldown',
	'Seated Row (Cable)': 'Seated Cable Row',
	'Cable Fly (Cable)': 'Cable Fly',
	'Triceps Pushdown (Cable)': 'Triceps Pushdown',
	'Lateral Raise (Dumbbell)': 'Lateral Raise',
	'Hammer Curl (Dumbbell)': 'Hammer Curl',
	'Bicep Curl (Dumbbell)': 'Dumbbell Curl',
	'Bicep Curl (Barbell)': 'Barbell Curl',
	'Leg Press (Machine)': 'Leg Press',
	'Leg Extension (Machine)': 'Leg Extension',
	'Lying Leg Curl (Machine)': 'Lying Leg Curl',
	'Seated Leg Curl (Machine)': 'Seated Leg Curl',
	'Calf Raise (Standing)': 'Standing Calf Raise',
	'Calf Raise (Seated)': 'Seated Calf Raise',
	'Hip Thrust (Barbell)': 'Hip Thrust',
	'Face Pull (Cable)': 'Face Pull',
	'Skullcrusher (Barbell)': 'Skull Crusher',
	'Skull Crusher (Barbell)': 'Skull Crusher'
};

function normalizeExercise(raw: string): { name: string; equipment: string } {
	const trimmed = raw.trim().replace(/\s+/g, ' ');
	const aliased = NAME_ALIASES[trimmed];
	if (aliased) {
		return { name: aliased, equipment: guessEquipment(trimmed) };
	}
	const m = trimmed.match(EQUIP_SUFFIX);
	if (m) {
		const equipment = titleEquip(m[1]);
		const base = trimmed.replace(EQUIP_SUFFIX, '').trim();
		const aliasedBase = NAME_ALIASES[base] ?? NAME_ALIASES[`${base} (${m[1]})`];
		return { name: aliasedBase ?? base, equipment };
	}
	return { name: trimmed, equipment: guessEquipment(trimmed) };
}

function titleEquip(s: string) {
	const map: Record<string, string> = {
		barbell: 'Barbell',
		dumbbell: 'Dumbbell',
		cable: 'Cable',
		machine: 'Machine',
		'smith machine': 'Smith Machine',
		bodyweight: 'Bodyweight',
		kettlebell: 'Kettlebell',
		band: 'Band',
		'ez bar': 'Barbell',
		'trap bar': 'Barbell'
	};
	return map[s.toLowerCase()] ?? 'Other';
}

function guessEquipment(name: string) {
	const m = name.match(EQUIP_SUFFIX);
	return m ? titleEquip(m[1]) : 'Other';
}

/**
 * Words that name a different exercise, not a grip variant.
 * A match is rejected when only one side has the word.
 */
const IDENTITY_TOKENS = new Set(['volume']);

/** Extra Strong wording we ignore when matching (grip style, laterality, etc.). */
const MODIFIER_TOKENS = new Set([
	'grip',
	'neutral',
	'underhand',
	'overhand',
	'pronated',
	'supinated',
	'wide',
	'close',
	'narrow',
	'parallel',
	'angled',
	'alternating',
	'unilateral',
	'bilateral',
	'left',
	'right',
	'pause',
	'tempo',
	'strict',
	'cheat',
	'double',
	'single'
]);

function tokens(name: string) {
	return name
		.toLowerCase()
		.replace(/[^a-z0-9\s]/g, ' ')
		.split(/\s+/)
		.filter(Boolean);
}

function significantTokens(name: string) {
	return tokens(name).filter((t) => !MODIFIER_TOKENS.has(t) && t.length > 1);
}

function identityMismatch(a: string, b: string) {
	const aTok = new Set(tokens(a));
	const bTok = new Set(tokens(b));
	for (const t of IDENTITY_TOKENS) {
		if (aTok.has(t) !== bTok.has(t)) return true;
	}
	return false;
}

/**
 * Score how well a Strong exercise name matches a library name.
 * e.g. "Jammer Arms Row Neutral Grip" → "Jammer Row"
 */
export function scoreExerciseMatch(strongName: string, libraryName: string): number {
	const s = strongName.toLowerCase().trim();
	const l = libraryName.toLowerCase().trim();
	if (!s || !l) return 0;
	if (s === l) return 1000;
	if (identityMismatch(s, l)) return 0;

	const sTok = tokens(s);
	const lTok = tokens(l);
	const sSig = significantTokens(s);
	const lSig = significantTokens(l);
	const sSet = new Set(sTok);

	if (!lSig.length) return 0;

	// Single-word library names only match when the Strong name is essentially the same lift.
	if (lSig.length < 2) {
		if (sSig.join(' ') === lSig.join(' ')) return 900;
		if (sTok.join(' ') === lTok.join(' ')) return 900;
		return 0;
	}

	// All meaningful library words appear in the Strong name.
	if (lSig.every((t) => sSet.has(t))) {
		return 100 + lSig.length * 20 + Math.min(l.length, 40);
	}

	// Contiguous phrase match ("jammer row" inside the Strong string).
	const sFlat = sTok.join(' ');
	const lFlat = lTok.join(' ');
	if (lFlat.length >= 6 && sFlat.includes(lFlat)) return 80 + l.length;

	// Overlap of significant tokens (needs at least two shared).
	const sSigSet = new Set(sSig);
	const inter = lSig.filter((t) => sSigSet.has(t)).length;
	if (inter >= 2) {
		const j = inter / new Set([...lSig, ...sSig]).size;
		if (j >= 0.5) return 40 + Math.round(j * 40) + inter * 5;
	}

	return 0;
}

export function matchLibraryExercise<T extends { name: string }>(
	strongName: string,
	library: T[]
): T | null {
	let best: T | null = null;
	let bestScore = 0;
	for (const ex of library) {
		const score = scoreExerciseMatch(strongName, ex.name);
		if (score > bestScore) {
			bestScore = score;
			best = ex;
		}
	}
	return bestScore > 0 ? best : null;
}

type SetKind = 'normal' | 'warmup' | 'failure';

function parseSetOrder(raw: string): { kind: SetKind; skip: boolean } | null {
	const s = raw.trim();
	if (!s) return { kind: 'normal', skip: false };
	const lower = s.toLowerCase();
	if (lower.includes('rest')) return null; // Rest Timer rows
	if (lower === 'w' || lower.startsWith('w')) return { kind: 'warmup', skip: false };
	if (lower === 'f' || lower.startsWith('f')) return { kind: 'failure', skip: false };
	if (lower === 'd') return { kind: 'normal', skip: false }; // drop set → normal
	return { kind: 'normal', skip: false };
}

type ParsedSet = {
	exerciseRaw: string;
	name: string;
	equipment: string;
	kind: SetKind;
	weightKg: number | null;
	reps: number | null;
	durationSec: number | null;
	notes: string | null;
};

type ParsedWorkout = {
	key: string;
	name: string;
	startedAt: Date;
	finishedAt: Date | null;
	notes: string | null;
	sets: ParsedSet[];
};

function toKg(weight: number | null, unit: 'kg' | 'lb') {
	if (weight == null) return null;
	return unit === 'lb' ? weight / 2.2046226218 : weight;
}

function parseWorkoutDurationSec(raw: string): number | null {
	const asNum = parseNum(raw);
	// Newer Strong exports use "Duration (sec)" as a plain number.
	if (asNum != null && asNum > 0) return Math.round(asNum);
	return parseStrongDuration(raw);
}

function detectWeightUnit(headers: string[], fallback: 'kg' | 'lb'): 'kg' | 'lb' {
	if (headers.includes('weight (kg)')) return 'kg';
	if (headers.includes('weight (lbs)') || headers.includes('weight (lb)')) return 'lb';
	return fallback;
}

export function parseStrongCsv(text: string, weightUnit: 'kg' | 'lb'): ParsedWorkout[] {
	const table = parseCsv(text);
	if (table.length < 2) throw new Error('CSV is empty.');

	const headers = table[0].map(headerKey);
	const need = ['date', 'workout name', 'exercise name'];
	const missing = need.filter((n) => !headers.includes(n));
	if (missing.length) {
		throw new Error(
			`Missing column "${missing[0]}". Upload Strong’s workout export (Settings → Export Strong Data), not the exercise mapping CSV.`
		);
	}

	const unit = detectWeightUnit(headers, weightUnit);

	const rows: Row[] = table.slice(1).map((cells) => {
		const row: Row = {};
		headers.forEach((h, i) => {
			row[h] = (cells[i] ?? '').trim();
		});
		return row;
	});

	const workouts = new Map<string, ParsedWorkout>();

	for (const row of rows) {
		const startedAt = parseDate(get(row, 'date'));
		if (!startedAt) continue;

		const workoutName = get(row, 'workout name') || 'Workout';
		const exerciseRaw = get(row, 'exercise name');
		if (!exerciseRaw) continue;

		const setMeta = parseSetOrder(get(row, 'set order'));
		if (!setMeta) continue;

		const weight = parseNum(
			get(row, 'weight', 'weight (kg)', 'weight (lbs)', 'weight (lb)')
		);
		const reps = parseNum(get(row, 'reps'));
		const seconds = parseNum(get(row, 'seconds'));
		// Skip empty junk rows (no load, reps, or duration)
		if (weight == null && reps == null && (seconds == null || seconds === 0)) continue;

		const key = `${startedAt.toISOString()}|${workoutName}`;
		let w = workouts.get(key);
		if (!w) {
			const durationSec = parseWorkoutDurationSec(get(row, 'duration', 'duration (sec)'));
			w = {
				key,
				name: workoutName.slice(0, 80),
				startedAt,
				finishedAt: durationSec != null ? new Date(startedAt.getTime() + durationSec * 1000) : null,
				notes: get(row, 'workout notes') || null,
				sets: []
			};
			workouts.set(key, w);
		} else if (!w.notes) {
			const wn = get(row, 'workout notes');
			if (wn) w.notes = wn;
		}

		const { name, equipment } = normalizeExercise(exerciseRaw);
		w.sets.push({
			exerciseRaw,
			name: name.slice(0, 80),
			equipment,
			kind: setMeta.kind,
			weightKg: toKg(weight, unit),
			reps: reps != null ? Math.round(reps) : null,
			durationSec: seconds != null && seconds > 0 ? Math.round(seconds) : null,
			notes: get(row, 'notes') || null
		});
	}

	return [...workouts.values()].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
}

export async function importStrongCsv(
	userId: string,
	text: string,
	weightUnit: 'kg' | 'lb'
): Promise<StrongImportResult> {
	const parsed = parseStrongCsv(text, weightUnit);
	if (!parsed.length) throw new Error('No workouts found in this file.');

	const existingExercises = await db
		.select({
			id: schema.exercise.id,
			name: schema.exercise.name,
			archived: schema.exercise.archived
		})
		.from(schema.exercise)
		.where(eq(schema.exercise.userId, userId));

	const byName = new Map(existingExercises.map((e) => [e.name.toLowerCase(), e]));

	const result: StrongImportResult = {
		workouts: 0,
		sets: 0,
		exercisesCreated: 0,
		skipped: 0,
		skippedExisting: 0
	};

	// Map each Strong exercise name onto the best library match (fuzzy), or create it.
	const resolved = new Map<string, string>(); // strong name (lower) → library name
	const needed = new Map<string, { name: string; equipment: string }>();

	for (const w of parsed) {
		for (const s of w.sets) {
			const key = s.name.toLowerCase();
			if (resolved.has(key) || needed.has(key)) continue;

			const exact = byName.get(key);
			if (exact) {
				resolved.set(key, exact.name);
				continue;
			}

			const fuzzy = matchLibraryExercise(s.name, existingExercises);
			if (fuzzy) {
				resolved.set(key, fuzzy.name);
				continue;
			}

			needed.set(key, { name: s.name, equipment: s.equipment });
		}
	}

	if (needed.size) {
		const created = await db
			.insert(schema.exercise)
			.values(
				[...needed.values()].map(({ name, equipment }) => ({
					userId,
					name,
					muscleGroup: 'Other',
					equipment: equipment || 'Other'
				}))
			)
			.returning({ id: schema.exercise.id, name: schema.exercise.name, archived: schema.exercise.archived });
		for (const e of created) {
			byName.set(e.name.toLowerCase(), e);
			resolved.set(e.name.toLowerCase(), e.name);
		}
		result.exercisesCreated = created.length;
	}

	// Un-archive matched exercises that were archived.
	for (const e of byName.values()) {
		if (e.archived) {
			await db.update(schema.exercise).set({ archived: false }).where(eq(schema.exercise.id, e.id));
			e.archived = false;
		}
	}

	function exerciseId(name: string) {
		const hit = byName.get(name.toLowerCase());
		if (!hit) throw new Error(`Exercise missing after seed: ${name}`);
		return hit.id;
	}

	function libraryName(strongName: string) {
		return resolved.get(strongName.toLowerCase()) ?? strongName;
	}

	for (const w of parsed) {
		if (!w.sets.length) {
			result.skipped++;
			continue;
		}

		const [existing] = await db
			.select({ id: schema.workout.id })
			.from(schema.workout)
			.where(
				and(
					eq(schema.workout.userId, userId),
					eq(schema.workout.name, w.name),
					eq(schema.workout.startedAt, w.startedAt),
					eq(schema.workout.status, 'completed')
				)
			)
			.limit(1);
		if (existing) {
			result.skippedExisting++;
			continue;
		}

		await db.transaction(async (tx) => {
			const [workout] = await tx
				.insert(schema.workout)
				.values({
					userId,
					name: w.name,
					notes: w.notes,
					status: 'completed',
					startedAt: w.startedAt,
					finishedAt: w.finishedAt ?? w.startedAt,
					updatedAt: new Date()
				})
				.returning({ id: schema.workout.id });

			const order: string[] = [];
			const groups = new Map<string, ParsedSet[]>();
			for (const s of w.sets) {
				const mapped = libraryName(s.name);
				const k = mapped.toLowerCase();
				if (!groups.has(k)) {
					groups.set(k, []);
					order.push(k);
				}
				groups.get(k)!.push({ ...s, name: mapped });
			}

			let pos = 0;
			for (const key of order) {
				const sets = groups.get(key)!;
				const first = sets[0];
				const [we] = await tx
					.insert(schema.workoutExercise)
					.values({
						workoutId: workout.id,
						exerciseId: exerciseId(first.name),
						position: pos++,
						notes: sets.map((s) => s.notes).find(Boolean) ?? null
					})
					.returning({ id: schema.workoutExercise.id });

				await tx.insert(schema.setLog).values(
					sets.map((s, i) => ({
						workoutExerciseId: we.id,
						position: i,
						type: s.kind,
						weightKg: s.weightKg,
						reps: s.reps,
						completed: true,
						completedAt: w.startedAt
					}))
				);
				result.sets += sets.length;
			}
		});

		result.workouts++;
	}

	return result;
}
