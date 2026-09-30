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
