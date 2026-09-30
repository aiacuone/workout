import { hitMethod } from './hit';
import type { HitLogView, SetView } from './types';
import { kgToDisplay, type WeightUnit } from './units';

export function setSummary(s: Pick<SetView, 'weightKg' | 'reps'>, unit: WeightUnit) {
	const w = s.weightKg != null ? `${kgToDisplay(s.weightKg, unit)} ${unit}` : 'BW';
	return s.reps != null ? `${w} × ${s.reps}` : w;
}

export function hitLogSummary(methodKey: string, l: HitLogView, unit: WeightUnit) {
	const m = hitMethod(methodKey);
	const parts: string[] = [];
	if (m.fields.includes('exercise') && l.data?.exerciseName) parts.push(l.data.exerciseName);
	if (m.fields.includes('rest') && l.restSec != null) parts.push(`+${l.restSec}s`);
	if (m.fields.includes('weight') && l.weightKg != null)
		parts.push(`${kgToDisplay(l.weightKg, unit)} ${unit}`);
	if (m.fields.includes('reps') && l.reps != null) parts.push(`× ${l.reps}`);
	if (m.fields.includes('duration') && l.durationSec != null)
		parts.push(methodKey === 'negatives' ? `${l.durationSec}s eccentric` : `${l.durationSec}s`);
	return parts.join(' ') || '—';
}

export function ratingLabel(r: number | null | undefined) {
	return r === 1 ? 'Rough' : r === 2 ? 'Solid' : r === 3 ? 'Great' : '';
}
