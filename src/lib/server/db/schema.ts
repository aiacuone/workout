import {
	boolean,
	date,
	doublePrecision,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp
} from 'drizzle-orm/pg-core';

const id = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });

export const user = pgTable('user', {
	id: id(),
	username: text('username').notNull().unique(),
	passwordHash: text('password_hash').notNull(),
	createdAt: ts('created_at').notNull().defaultNow()
});

export const session = pgTable(
	'session',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		expiresAt: ts('expires_at').notNull()
	},
	(t) => [index('session_user_idx').on(t.userId)]
);

export const userPrefs = pgTable('user_prefs', {
	userId: text('user_id')
		.primaryKey()
		.references(() => user.id, { onDelete: 'cascade' }),
	weightUnit: text('weight_unit', { enum: ['kg', 'lb'] })
		.notNull()
		.default('kg'),
	lengthUnit: text('length_unit', { enum: ['cm', 'in'] })
		.notNull()
		.default('cm'),
	sex: text('sex', { enum: ['male', 'female'] })
		.notNull()
		.default('male'),
	heightCm: doublePrecision('height_cm'),
	defaultRestSec: integer('default_rest_sec').notNull().default(90)
});

export const exercise = pgTable(
	'exercise',
	{
		id: id(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		name: text('name').notNull(),
		muscleGroup: text('muscle_group').notNull(),
		equipment: text('equipment').notNull(),
		notes: text('notes'),
		restSec: integer('rest_sec'),
		archived: boolean('archived').notNull().default(false),
		createdAt: ts('created_at').notNull().defaultNow()
	},
	(t) => [index('exercise_user_idx').on(t.userId)]
);

export const routine = pgTable('routine', {
	id: id(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	name: text('name').notNull(),
	notes: text('notes'),
	createdAt: ts('created_at').notNull().defaultNow(),
	updatedAt: ts('updated_at').notNull().defaultNow()
});

export const routineExercise = pgTable(
	'routine_exercise',
	{
		id: id(),
		routineId: text('routine_id')
			.notNull()
			.references(() => routine.id, { onDelete: 'cascade' }),
		exerciseId: text('exercise_id')
			.notNull()
			.references(() => exercise.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		targetSets: integer('target_sets').notNull().default(3),
		repRange: text('rep_range'),
		targetWeightKg: doublePrecision('target_weight_kg'),
		cableHeight: text('cable_height'),
		seatHeight: text('seat_height')
	},
	(t) => [index('routine_exercise_routine_idx').on(t.routineId)]
);

export const workout = pgTable(
	'workout',
	{
		id: id(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		routineId: text('routine_id').references(() => routine.id, { onDelete: 'set null' }),
		name: text('name').notNull(),
		notes: text('notes'),
		status: text('status', { enum: ['in_progress', 'completed', 'discarded'] })
			.notNull()
			.default('in_progress'),
		startedAt: ts('started_at').notNull().defaultNow(),
		finishedAt: ts('finished_at'),
		version: integer('version').notNull().default(0),
		restEndsAt: ts('rest_ends_at'),
		restTotalSec: integer('rest_total_sec'),
		restWeId: text('rest_we_id'),
		updatedAt: ts('updated_at').notNull().defaultNow()
	},
	(t) => [index('workout_user_status_idx').on(t.userId, t.status)]
);

export const workoutExercise = pgTable(
	'workout_exercise',
	{
		id: id(),
		workoutId: text('workout_id')
			.notNull()
			.references(() => workout.id, { onDelete: 'cascade' }),
		exerciseId: text('exercise_id')
			.notNull()
			.references(() => exercise.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		cableHeight: text('cable_height'),
		seatHeight: text('seat_height'),
		repRange: text('rep_range'),
		rating: integer('rating'),
		notes: text('notes')
	},
	(t) => [
		index('workout_exercise_workout_idx').on(t.workoutId),
		index('workout_exercise_exercise_idx').on(t.exerciseId)
	]
);

export const setLog = pgTable(
	'set_log',
	{
		id: id(),
		workoutExerciseId: text('workout_exercise_id')
			.notNull()
			.references(() => workoutExercise.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		type: text('type', { enum: ['normal', 'warmup', 'failure'] })
			.notNull()
			.default('normal'),
		weightKg: doublePrecision('weight_kg'),
		reps: integer('reps'),
		completed: boolean('completed').notNull().default(false),
		completedAt: ts('completed_at')
	},
	(t) => [index('set_log_we_idx').on(t.workoutExerciseId)]
);

export const hitMethod = pgTable('hit_method', {
	key: text('key').primaryKey(),
	name: text('name').notNull(),
	color: text('color').notNull(),
	description: text('description').notNull(),
	position: integer('position').notNull()
});

export const hitApplication = pgTable(
	'hit_application',
	{
		id: id(),
		workoutExerciseId: text('workout_exercise_id')
			.notNull()
			.references(() => workoutExercise.id, { onDelete: 'cascade' }),
		methodKey: text('method_key')
			.notNull()
			.references(() => hitMethod.key),
		position: integer('position').notNull(),
		notes: text('notes'),
		createdAt: ts('created_at').notNull().defaultNow()
	},
	(t) => [index('hit_application_we_idx').on(t.workoutExerciseId)]
);

export type HitLogData = { exerciseId?: string; exerciseName?: string };

export const hitLog = pgTable(
	'hit_log',
	{
		id: id(),
		hitApplicationId: text('hit_application_id')
			.notNull()
			.references(() => hitApplication.id, { onDelete: 'cascade' }),
		position: integer('position').notNull(),
		weightKg: doublePrecision('weight_kg'),
		reps: integer('reps'),
		durationSec: integer('duration_sec'),
		restSec: integer('rest_sec'),
		data: jsonb('data').$type<HitLogData>().notNull().default({}),
		completed: boolean('completed').notNull().default(false),
		completedAt: ts('completed_at')
	},
	(t) => [index('hit_log_app_idx').on(t.hitApplicationId)]
);

export const bodyMeasurement = pgTable(
	'body_measurement',
	{
		id: id(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		measuredOn: date('measured_on', { mode: 'string' }).notNull(),
		weightKg: doublePrecision('weight_kg'),
		neckCm: doublePrecision('neck_cm'),
		shouldersCm: doublePrecision('shoulders_cm'),
		chestCm: doublePrecision('chest_cm'),
		bicepLCm: doublePrecision('bicep_l_cm'),
		bicepRCm: doublePrecision('bicep_r_cm'),
		waistCm: doublePrecision('waist_cm'),
		hipsCm: doublePrecision('hips_cm'),
		thighLCm: doublePrecision('thigh_l_cm'),
		thighRCm: doublePrecision('thigh_r_cm'),
		calfLCm: doublePrecision('calf_l_cm'),
		calfRCm: doublePrecision('calf_r_cm'),
		heightCm: doublePrecision('height_cm'),
		bodyFatPct: doublePrecision('body_fat_pct'),
		calories: integer('calories'),
		notes: text('notes'),
		createdAt: ts('created_at').notNull().defaultNow()
	},
	(t) => [index('body_measurement_user_idx').on(t.userId, t.measuredOn)]
);

export type User = typeof user.$inferSelect;
export type Session = typeof session.$inferSelect;
export type UserPrefs = typeof userPrefs.$inferSelect;
export type Exercise = typeof exercise.$inferSelect;
export type BodyMeasurement = typeof bodyMeasurement.$inferSelect;
