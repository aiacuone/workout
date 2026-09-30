export type HitField = 'weight' | 'reps' | 'duration' | 'rest' | 'exercise';

export type HitMethodDef = {
	key: string;
	name: string;
	short: string;
	color: string;
	ink: string;
	description: string;
	/** Label for one logged entry, e.g. "Drop 1". */
	entryLabel: string;
	fields: HitField[];
	/** Default rest (seconds) for methods with intra-set rests. */
	defaultRest?: number;
};

export const HIT_METHODS: HitMethodDef[] = [
	{
		key: 'drop_set',
		name: 'Drop Set',
		short: 'DROP',
		color: '#e5484d',
		ink: '#ffffff',
		description:
			'Go to failure, instantly cut the weight by 20–30% and rep out to a second failure.',
		entryLabel: 'Drop',
		fields: ['weight', 'reps']
	},
	{
		key: 'rest_pause',
		name: 'Rest-Pause',
		short: 'R-P',
		color: '#f76b15',
		ink: '#ffffff',
		description:
			'Take a set to failure, rest 10–20 s, then squeeze out more reps with the same weight. Repeat 2–3 times.',
		entryLabel: 'Cluster',
		fields: ['rest', 'weight', 'reps'],
		defaultRest: 15
	},
	{
		key: 'forced_reps',
		name: 'Forced Reps',
		short: 'FORCED',
		color: '#ffc53d',
		ink: '#14201d',
		description:
			'Past failure, a partner gives just enough assistance (~10–20%) for 2–4 more reps.',
		entryLabel: 'Forced',
		fields: ['weight', 'reps']
	},
	{
		key: 'negatives',
		name: 'Negatives',
		short: 'NEG',
		color: '#8e4ec6',
		ink: '#ffffff',
		description:
			'Accentuated eccentrics: 3–5 s controlled lowering with a load above your concentric max. Spotters required.',
		entryLabel: 'Negative',
		fields: ['weight', 'reps', 'duration']
	},
	{
		key: 'partial_reps',
		name: 'Partial Reps',
		short: 'PARTIAL',
		color: '#12a594',
		ink: '#ffffff',
		description:
			'After full-range failure, shorten the stroke and keep moving through the strongest portion.',
		entryLabel: 'Partials',
		fields: ['weight', 'reps']
	},
	{
		key: 'isometric',
		name: 'Isometric Hold',
		short: 'ISO',
		color: '#0090ff',
		ink: '#ffffff',
		description:
			'Squeeze maximally at peak contraction or against an immovable load until you can no longer hold.',
		entryLabel: 'Hold',
		fields: ['weight', 'duration']
	},
	{
		key: 'pre_exhaustion',
		name: 'Pre-Exhaustion',
		short: 'PRE-EX',
		color: '#d6409f',
		ink: '#ffffff',
		description:
			'An isolation exercise immediately before the compound (e.g. leg extensions before squats).',
		entryLabel: 'Pre-ex',
		fields: ['exercise', 'weight', 'reps']
	},
	{
		key: 'cluster',
		name: 'Cluster Set',
		short: 'CLUSTER',
		color: '#2f8a3e',
		ink: '#ffffff',
		description:
			'Break one heavy set into mini-sets with 10–30 s intra-set rests for more force and volume.',
		entryLabel: 'Mini-set',
		fields: ['weight', 'reps', 'rest'],
		defaultRest: 20
	}
];

export const HIT_BY_KEY: Record<string, HitMethodDef> = Object.fromEntries(
	HIT_METHODS.map((m) => [m.key, m])
);

export function hitMethod(key: string): HitMethodDef {
	return (
		HIT_BY_KEY[key] ?? {
			key,
			name: key,
			short: key.toUpperCase(),
			color: '#5d6b68',
			ink: '#ffffff',
			description: '',
			entryLabel: 'Entry',
			fields: ['weight', 'reps']
		}
	);
}
