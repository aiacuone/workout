export const MEASUREMENT_FIELDS = [
	{ key: 'neckCm', label: 'Neck', bf: true },
	{ key: 'waistCm', label: 'Waist', bf: true, hint: 'at the navel' },
	{ key: 'hipsCm', label: 'Hips', bf: true, hint: 'widest point' },
	{ key: 'shouldersCm', label: 'Shoulders' },
	{ key: 'chestCm', label: 'Chest' },
	{ key: 'bicepLCm', label: 'Bicep L' },
	{ key: 'bicepRCm', label: 'Bicep R' }
] as const;

export type MeasurementKey = (typeof MEASUREMENT_FIELDS)[number]['key'];

export type MeasurementChange = 'up' | 'down' | 'same' | 'missing';

/** Change between two stored values after they are shown in display units. Same displayed value is unchanged. */
export function measurementDelta(
	current: number,
	previous: number | null | undefined,
	format: (n: number) => string
): { change: MeasurementChange; amount: string } {
	if (previous == null || !Number.isFinite(previous)) return { change: 'missing', amount: '' };
	const shownCurrent = format(current);
	const shownPrevious = format(previous);
	if (shownCurrent === '' || shownPrevious === '' || shownCurrent === shownPrevious)
		return { change: 'same', amount: '' };
	const delta = Number(shownCurrent) - Number(shownPrevious);
	if (!Number.isFinite(delta) || delta === 0) return { change: 'same', amount: '' };
	const amount = String(Math.round(Math.abs(delta) * 10) / 10);
	return { change: delta > 0 ? 'up' : 'down', amount };
}
