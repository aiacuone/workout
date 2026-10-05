const SPLIT = /\s*[-–—]\s*/;

/** Integer 1–999, or '' if empty or out of bounds. */
function part(raw: string): string {
	const digits = raw.replace(/\D/g, '').replace(/^0+/, '');
	if (!digits || digits.length > 3) return '';
	const n = Number(digits);
	if (!Number.isInteger(n) || n < 1 || n > 999) return '';
	return String(n);
}

/** `"8-12"` → min 8, max 12. `"8"` → min 8. Empty → both empty. */
export function parseRepRange(value: string | null | undefined): { min: string; max: string } {
	const text = value?.trim() ?? '';
	if (!text) return { min: '', max: '' };
	const [a, b] = text.split(SPLIT);
	if (b === undefined) return { min: part(a ?? ''), max: '' };
	return { min: part(a ?? ''), max: part(b) };
}

/** Both set → `"min-max"`. Only one set → that number. Both empty → null. */
export function composeRepRange(minRaw: string, maxRaw: string): string | null {
	const min = part(minRaw);
	const max = part(maxRaw);
	if (min && max) return `${min}-${max}`;
	if (min) return min;
	if (max) return max;
	return null;
}
