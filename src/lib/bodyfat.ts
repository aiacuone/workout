export type Sex = 'male' | 'female';

/**
 * US Navy circumference method. All inputs in centimetres.
 * Returns body-fat percentage rounded to one decimal, or null when inputs are missing/invalid.
 */
export function navyBodyFat(input: {
	sex: Sex;
	heightCm: number | null | undefined;
	neckCm: number | null | undefined;
	waistCm: number | null | undefined;
	hipsCm?: number | null;
}): number | null {
	const { sex, heightCm, neckCm, waistCm, hipsCm } = input;
	if (!heightCm || !neckCm || !waistCm) return null;

	let density: number;
	if (sex === 'male') {
		const diff = waistCm - neckCm;
		if (diff <= 0) return null;
		density = 1.0324 - 0.19077 * Math.log10(diff) + 0.15456 * Math.log10(heightCm);
	} else {
		if (!hipsCm) return null;
		const diff = waistCm + hipsCm - neckCm;
		if (diff <= 0) return null;
		density = 1.29579 - 0.35004 * Math.log10(diff) + 0.221 * Math.log10(heightCm);
	}

	const pct = 495 / density - 450;
	if (!Number.isFinite(pct) || pct < 2 || pct > 70) return null;
	return Math.round(pct * 10) / 10;
}
