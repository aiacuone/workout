/** Select the whole value so the next keystroke replaces it. */
export function selectAll(e: Event) {
	const el = e.currentTarget;
	if (!(el instanceof HTMLInputElement)) return;
	// A click places the caret after focus, so re-apply once that has settled.
	requestAnimationFrame(() => {
		if (document.activeElement !== el) return;
		try {
			el.setSelectionRange(0, el.value.length);
		} catch {
			// Some input types do not allow a selection.
		}
	});
}
