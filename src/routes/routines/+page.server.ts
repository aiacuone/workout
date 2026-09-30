import { fail, redirect } from '@sveltejs/kit';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '$lib/server/db';
import { getOwnedRoutine, listRoutines } from '$lib/server/routines';
import { requireUser, str } from '$lib/server/util';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireUser(locals);
	return { routines: await listRoutines(user.id) };
};

export const actions: Actions = {
	create: async ({ locals, request }) => {
		const user = requireUser(locals);
		const name = str(await request.formData(), 'name');
		if (!name) return fail(400, { error: 'Give the routine a name.' });
		const [r] = await db
			.insert(schema.routine)
			.values({ userId: user.id, name: name.slice(0, 80) })
			.returning({ id: schema.routine.id });
		redirect(303, `/routines/${r.id}`);
	},

	delete: async ({ locals, request }) => {
		const user = requireUser(locals);
		const id = str(await request.formData(), 'id');
		const routine = await getOwnedRoutine(user.id, id);
		if (!routine) return fail(404, { error: 'Routine not found.' });
		await db
			.delete(schema.routine)
			.where(and(eq(schema.routine.id, routine.id), eq(schema.routine.userId, user.id)));
	}
};
