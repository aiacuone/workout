import { eq } from 'drizzle-orm';
import { BMT_FIELDS, parseBmtCsv, type BmtEntry, type BmtField } from '$lib/bmt';
import type { Sex } from '$lib/bodyfat';
import { db, schema } from './db';

export type MeasurementImportResult = {
	inserted: number;
	updated: number;
	skipped: number;
	unknownRows: number;
};

function patchFor(existing: schema.BodyMeasurement, entry: BmtEntry) {
	const patch: { notes?: string } & Partial<Record<BmtField, number>> = {};
	for (const field of BMT_FIELDS) {
		const value = entry[field];
		if (value != null && existing[field] == null) patch[field] = value;
	}
	if (entry.notes && !existing.notes) patch.notes = entry.notes;
	return patch;
}

export async function importBmtCsv(
	userId: string,
	text: string,
	prefs: { sex: Sex; heightCm: number | null }
): Promise<MeasurementImportResult> {
	const parsed = parseBmtCsv(text, prefs);
	if (parsed.entries.length === 0) throw new Error('No measurement rows found in this file.');

	if (prefs.heightCm == null && parsed.heightCm != null) {
		await db
			.update(schema.userPrefs)
			.set({ heightCm: parsed.heightCm })
			.where(eq(schema.userPrefs.userId, userId));
	}

	const existing = await db
		.select()
		.from(schema.bodyMeasurement)
		.where(eq(schema.bodyMeasurement.userId, userId));

	let inserted = 0;
	let updated = 0;
	let skipped = 0;

	for (const entry of parsed.entries) {
		const dayRows = existing.filter((row) => row.measuredOn === entry.measuredOn);
		if (dayRows.length === 0) {
			const [created] = await db
				.insert(schema.bodyMeasurement)
				.values({ userId, ...entry })
				.returning();
			existing.push(created);
			inserted++;
			continue;
		}

		const target = dayRows.find((row) => Object.keys(patchFor(row, entry)).length > 0);
		if (!target) {
			skipped++;
			continue;
		}

		const patch = patchFor(target, entry);
		await db.update(schema.bodyMeasurement).set(patch).where(eq(schema.bodyMeasurement.id, target.id));
		Object.assign(target, patch);
		updated++;
	}

	return { inserted, updated, skipped, unknownRows: parsed.unknownRows };
}
