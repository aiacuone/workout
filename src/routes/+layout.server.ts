import { ensureDefaultExercises } from '$lib/server/exercises';
import { getActiveWorkout, getPrefs } from '$lib/server/util';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) return { user: null, prefs: null, active: null };
	const [prefs, active] = await Promise.all([
		getPrefs(locals.user.id),
		getActiveWorkout(locals.user.id),
		ensureDefaultExercises(locals.user.id)
	]);
	return {
		user: locals.user,
		prefs: {
			weightUnit: prefs.weightUnit,
			lengthUnit: prefs.lengthUnit,
			sex: prefs.sex,
			heightCm: prefs.heightCm,
			defaultRestSec: prefs.defaultRestSec
		},
		active: active ? { ...active, startedAt: active.startedAt.toISOString() } : null
	};
};
