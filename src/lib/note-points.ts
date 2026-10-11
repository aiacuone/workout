/** Split a stored note into dot points. Existing prose stays one point. */
export function notePoints(notes: string | null | undefined): string[] {
	if (!notes) return [];
	return notes
		.split('\n')
		.map((line) => line.replace(/^\s*[-•*]\s+/, '').trim())
		.filter(Boolean);
}

export function joinNotePoints(points: string[]): string | null {
	const kept = points.map((point) => point.trim()).filter(Boolean);
	return kept.length ? kept.join('\n') : null;
}
