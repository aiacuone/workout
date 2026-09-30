export type WeightUnit = 'kg' | 'lb';
export type LengthUnit = 'cm' | 'in';

const LB_PER_KG = 2.2046226218;
const CM_PER_IN = 2.54;

function trim(n: number, digits: number) {
	return String(Math.round(n * 10 ** digits) / 10 ** digits);
}

export function kgToDisplay(kg: number | null | undefined, unit: WeightUnit): string {
	if (kg == null) return '';
	return trim(unit === 'lb' ? kg * LB_PER_KG : kg, unit === 'lb' ? 1 : 2);
}

export function displayToKg(value: string | number | null | undefined, unit: WeightUnit) {
	if (value === '' || value == null) return null;
	const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
	if (!Number.isFinite(n)) return null;
	return unit === 'lb' ? n / LB_PER_KG : n;
}

export function cmToDisplay(cm: number | null | undefined, unit: LengthUnit): string {
	if (cm == null) return '';
	return trim(unit === 'in' ? cm / CM_PER_IN : cm, 1);
}

export function displayToCm(value: string | number | null | undefined, unit: LengthUnit) {
	if (value === '' || value == null) return null;
	const n = typeof value === 'number' ? value : Number(String(value).replace(',', '.'));
	if (!Number.isFinite(n) || n <= 0) return null;
	return unit === 'in' ? n * CM_PER_IN : n;
}

export function formatDuration(totalSec: number): string {
	const s = Math.max(0, Math.floor(totalSec));
	const h = Math.floor(s / 3600);
	const m = Math.floor((s % 3600) / 60);
	const sec = s % 60;
	if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
	return `${m}:${String(sec).padStart(2, '0')}`;
}

export function formatDate(iso: string | Date, opts: Intl.DateTimeFormatOptions = {}) {
	const d = typeof iso === 'string' ? new Date(iso) : iso;
	return d.toLocaleDateString(undefined, {
		weekday: 'short',
		day: 'numeric',
		month: 'short',
		...opts
	});
}

/** Epley estimated one-rep max. */
export function e1rm(weightKg: number, reps: number) {
	if (reps <= 0) return 0;
	if (reps === 1) return weightKg;
	return weightKg * (1 + reps / 30);
}
