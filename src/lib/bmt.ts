import { navyBodyFat, type Sex } from './bodyfat';

export const BMT_FIELDS = [
	'weightKg',
	'neckCm',
	'shouldersCm',
	'chestCm',
	'bicepLCm',
	'bicepRCm',
	'waistCm',
	'hipsCm',
	'thighLCm',
	'thighRCm',
	'calfLCm',
	'calfRCm',
	'heightCm',
	'bodyFatPct'
] as const;

export type BmtField = (typeof BMT_FIELDS)[number];

export type BmtEntry = {
	measuredOn: string;
	notes: string | null;
} & Record<BmtField, number | null>;

export type BmtParseResult = {
	entries: BmtEntry[];
	unknownRows: number;
	sex: Sex | null;
	heightCm: number | null;
};

const SCALAR: Record<string, BmtField> = {
	NECK: 'neckCm',
	SHOULDER: 'shouldersCm',
	SHOULDERS: 'shouldersCm',
	CHEST: 'chestCm',
	BUST: 'chestCm',
	THORAX: 'chestCm',
	WAIST: 'waistCm',
	ABDOMEN: 'waistCm',
	BELLY: 'waistCm',
	HIP: 'hipsCm',
	HIPS: 'hipsCm',
	HEIGHT: 'heightCm',
	WEIGHT: 'weightKg',
	BODYWEIGHT: 'weightKg',
	BODYFAT: 'bodyFatPct',
	FAT: 'bodyFatPct',
	FATPERCENT: 'bodyFatPct'
};

const BILATERAL: Record<string, 'bicep' | 'thigh' | 'calf'> = {
	BICEP: 'bicep',
	BICEPS: 'bicep',
	ARM: 'bicep',
	ARMS: 'bicep',
	THIGH: 'thigh',
	THIGHS: 'thigh',
	CALF: 'calf',
	CALVES: 'calf'
};

const BILATERAL_FIELD: Record<'bicep' | 'thigh' | 'calf', { left: BmtField; right: BmtField }> = {
	bicep: { left: 'bicepLCm', right: 'bicepRCm' },
	thigh: { left: 'thighLCm', right: 'thighRCm' },
	calf: { left: 'calfLCm', right: 'calfRCm' }
};

function parseCsv(text: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let cell = '';
	let i = 0;
	let inQuotes = false;
	const s = text.replace(/^\uFEFF/, '');

	while (i < s.length) {
		const c = s[i];
		if (inQuotes) {
			if (c === '"') {
				if (s[i + 1] === '"') {
					cell += '"';
					i += 2;
					continue;
				}
				inQuotes = false;
				i++;
				continue;
			}
			cell += c;
			i++;
			continue;
		}
		if (c === '"') {
			inQuotes = true;
			i++;
			continue;
		}
		if (c === ',' || c === ';') {
			row.push(cell);
			cell = '';
			i++;
			continue;
		}
		if (c === '\n' || (c === '\r' && s[i + 1] === '\n')) {
			row.push(cell);
			cell = '';
			if (row.some((v) => v.trim() !== '')) rows.push(row);
			row = [];
			i += c === '\r' ? 2 : 1;
			continue;
		}
		if (c === '\r') {
			row.push(cell);
			cell = '';
			if (row.some((v) => v.trim() !== '')) rows.push(row);
			row = [];
			i++;
			continue;
		}
		cell += c;
		i++;
	}
	row.push(cell);
	if (row.some((v) => v.trim() !== '')) rows.push(row);
	return rows;
}

function normKey(raw: string) {
	return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

function headerIndex(headers: string[], name: string) {
	const want = name.toLowerCase();
	return headers.findIndex((h) => h.trim().toLowerCase() === want);
}

function blankEntry(measuredOn: string): BmtEntry {
	return {
		measuredOn,
		notes: null,
		weightKg: null,
		neckCm: null,
		shouldersCm: null,
		chestCm: null,
		bicepLCm: null,
		bicepRCm: null,
		waistCm: null,
		hipsCm: null,
		thighLCm: null,
		thighRCm: null,
		calfLCm: null,
		calfRCm: null,
		heightCm: null,
		bodyFatPct: null
	};
}

function fieldFor(definedKey: string, side: string): BmtField | null {
	const key = normKey(definedKey);
	const scalar = SCALAR[key];
	if (scalar) return scalar;
	const pair = BILATERAL[key];
	if (!pair) return null;
	const fields = BILATERAL_FIELD[pair];
	return side === 'right' ? fields.right : fields.left;
}

function parseNum(raw: string): number | null {
	const s = raw.trim().replace(/\s/g, '').replace(',', '.');
	if (!s) return null;
	const n = Number(s);
	return Number.isFinite(n) && n > 0 ? n : null;
}

function convertValue(n: number, unitRaw: string, field: BmtField, metric: boolean): number | null {
	const unit = unitRaw.trim().toLowerCase();
	if (field === 'bodyFatPct') return n;
	if (field === 'weightKg') {
		if (unit === 'lb' || unit === 'lbs' || unit === 'pound' || unit === 'pounds') return n / 2.2046226218;
		if (unit === 'kg' || unit === 'kilogram' || unit === 'kilograms') return n;
		if (unit === '') return metric ? n : n / 2.2046226218;
		return null;
	}
	if (unit === 'in' || unit === 'inch' || unit === 'inches') return n * 2.54;
	if (unit === 'm' || unit === 'meter' || unit === 'meters') return n * 100;
	if (unit === 'cm' || unit === 'centimeter' || unit === 'centimeters') return n;
	if (unit === '') return metric ? n : n * 2.54;
	return null;
}

function readMeta(text: string): { sex: Sex | null; metric: boolean } {
	const sexMatch = text.match(/^#\s*Sex:\s*(male|female)\s*$/im);
	const system = text.match(/^#\s*MeasurementSystem:\s*(\w+)\s*$/im);
	const sex = sexMatch ? (sexMatch[1].toLowerCase() as Sex) : null;
	const metric = system?.[1].toLowerCase() !== 'imperial';
	return { sex, metric };
}

function heightOnOrBefore(date: string, heights: { date: string; cm: number }[]) {
	let found: number | null = null;
	for (const h of heights) {
		if (h.date <= date) found = h.cm;
	}
	return found ?? heights[0]?.cm ?? null;
}

/** Parse a Body Measurement Tracker export (`# BMT Measurement Export`). */
export function parseBmtCsv(
	text: string,
	fallback: { sex: Sex; heightCm: number | null }
): BmtParseResult {
	const meta = readMeta(text);
	const body = text
		.replace(/^\uFEFF/, '')
		.split(/\r?\n/)
		.filter((line) => !line.trim().startsWith('#'))
		.join('\n');
	const table = parseCsv(body);
	if (table.length < 2) throw new Error('This file has no measurement rows.');

	const headers = table[0];
	const col = {
		date: headerIndex(headers, 'Date'),
		value: headerIndex(headers, 'Value'),
		unit: headerIndex(headers, 'Unit'),
		notes: headerIndex(headers, 'Notes'),
		key: headerIndex(headers, 'DefinedKey'),
		side: headerIndex(headers, 'LeftRight')
	};
	if (col.date < 0 || col.value < 0 || col.key < 0)
		throw new Error(
			'This doesn’t look like a Body Measurement Tracker export. Expected columns Date, Value, and DefinedKey.'
		);

	const byDate = new Map<string, BmtEntry>();
	let unknownRows = 0;

	for (const cells of table.slice(1)) {
		const measuredOn = (cells[col.date] ?? '').trim();
		if (!/^\d{4}-\d{2}-\d{2}$/.test(measuredOn)) {
			unknownRows++;
			continue;
		}
		const field = fieldFor(cells[col.key] ?? '', (col.side >= 0 ? cells[col.side] : '').trim().toLowerCase());
		if (!field) {
			unknownRows++;
			continue;
		}
		const n = parseNum(cells[col.value] ?? '');
		if (n == null) {
			unknownRows++;
			continue;
		}
		const value = convertValue(n, col.unit >= 0 ? (cells[col.unit] ?? '') : '', field, meta.metric);
		if (value == null) {
			unknownRows++;
			continue;
		}
		const entry = byDate.get(measuredOn) ?? blankEntry(measuredOn);
		entry[field] = value;
		const note = col.notes >= 0 ? (cells[col.notes] ?? '').trim() : '';
		if (note) entry.notes = entry.notes ? `${entry.notes} · ${note}` : note;
		byDate.set(measuredOn, entry);
	}

	const heights = [...byDate.values()]
		.filter((e) => e.heightCm != null)
		.map((e) => ({ date: e.measuredOn, cm: e.heightCm as number }))
		.sort((a, b) => a.date.localeCompare(b.date));

	const sex = meta.sex ?? fallback.sex;
	const entries = [...byDate.values()].sort((a, b) => a.measuredOn.localeCompare(b.measuredOn));

	for (const entry of entries) {
		const height = entry.heightCm ?? heightOnOrBefore(entry.measuredOn, heights) ?? fallback.heightCm;
		if (height != null) entry.heightCm = height;
		if (entry.bodyFatPct == null) {
			entry.bodyFatPct = navyBodyFat({
				sex,
				heightCm: height,
				neckCm: entry.neckCm,
				waistCm: entry.waistCm,
				hipsCm: entry.hipsCm
			});
		}
	}

	return { entries, unknownRows, sex: meta.sex, heightCm: heights.at(-1)?.cm ?? fallback.heightCm };
}
