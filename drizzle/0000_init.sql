CREATE TABLE "body_measurement" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"measured_on" date NOT NULL,
	"weight_kg" double precision,
	"neck_cm" double precision,
	"shoulders_cm" double precision,
	"chest_cm" double precision,
	"bicep_l_cm" double precision,
	"bicep_r_cm" double precision,
	"waist_cm" double precision,
	"hips_cm" double precision,
	"thigh_l_cm" double precision,
	"thigh_r_cm" double precision,
	"calf_l_cm" double precision,
	"calf_r_cm" double precision,
	"height_cm" double precision,
	"body_fat_pct" double precision,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "exercise" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"muscle_group" text NOT NULL,
	"equipment" text NOT NULL,
	"notes" text,
	"rest_sec" integer,
	"archived" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hit_application" (
	"id" text PRIMARY KEY NOT NULL,
	"workout_exercise_id" text NOT NULL,
	"method_key" text NOT NULL,
	"position" integer NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hit_log" (
	"id" text PRIMARY KEY NOT NULL,
	"hit_application_id" text NOT NULL,
	"position" integer NOT NULL,
	"weight_kg" double precision,
	"reps" integer,
	"duration_sec" integer,
	"rest_sec" integer,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "hit_method" (
	"key" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"color" text NOT NULL,
	"description" text NOT NULL,
	"position" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "routine_exercise" (
	"id" text PRIMARY KEY NOT NULL,
	"routine_id" text NOT NULL,
	"exercise_id" text NOT NULL,
	"position" integer NOT NULL,
	"target_sets" integer DEFAULT 3 NOT NULL,
	"rep_range" text,
	"target_weight_kg" double precision
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "set_log" (
	"id" text PRIMARY KEY NOT NULL,
	"workout_exercise_id" text NOT NULL,
	"position" integer NOT NULL,
	"type" text DEFAULT 'normal' NOT NULL,
	"weight_kg" double precision,
	"reps" integer,
	"completed" boolean DEFAULT false NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"username" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_username_unique" UNIQUE("username")
);
--> statement-breakpoint
CREATE TABLE "user_prefs" (
	"user_id" text PRIMARY KEY NOT NULL,
	"weight_unit" text DEFAULT 'kg' NOT NULL,
	"length_unit" text DEFAULT 'cm' NOT NULL,
	"sex" text DEFAULT 'male' NOT NULL,
	"height_cm" double precision,
	"default_rest_sec" integer DEFAULT 90 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"routine_id" text,
	"name" text NOT NULL,
	"notes" text,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"version" integer DEFAULT 0 NOT NULL,
	"rest_ends_at" timestamp with time zone,
	"rest_total_sec" integer,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workout_exercise" (
	"id" text PRIMARY KEY NOT NULL,
	"workout_id" text NOT NULL,
	"exercise_id" text NOT NULL,
	"position" integer NOT NULL,
	"cable_height" text,
	"seat_height" text,
	"rep_range" text,
	"rating" integer,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "body_measurement" ADD CONSTRAINT "body_measurement_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "exercise" ADD CONSTRAINT "exercise_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hit_application" ADD CONSTRAINT "hit_application_workout_exercise_id_workout_exercise_id_fk" FOREIGN KEY ("workout_exercise_id") REFERENCES "public"."workout_exercise"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hit_application" ADD CONSTRAINT "hit_application_method_key_hit_method_key_fk" FOREIGN KEY ("method_key") REFERENCES "public"."hit_method"("key") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hit_log" ADD CONSTRAINT "hit_log_hit_application_id_hit_application_id_fk" FOREIGN KEY ("hit_application_id") REFERENCES "public"."hit_application"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine" ADD CONSTRAINT "routine_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_exercise" ADD CONSTRAINT "routine_exercise_routine_id_routine_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routine"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routine_exercise" ADD CONSTRAINT "routine_exercise_exercise_id_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "set_log" ADD CONSTRAINT "set_log_workout_exercise_id_workout_exercise_id_fk" FOREIGN KEY ("workout_exercise_id") REFERENCES "public"."workout_exercise"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_prefs" ADD CONSTRAINT "user_prefs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout" ADD CONSTRAINT "workout_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout" ADD CONSTRAINT "workout_routine_id_routine_id_fk" FOREIGN KEY ("routine_id") REFERENCES "public"."routine"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_workout_id_workout_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workout"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workout_exercise" ADD CONSTRAINT "workout_exercise_exercise_id_exercise_id_fk" FOREIGN KEY ("exercise_id") REFERENCES "public"."exercise"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "body_measurement_user_idx" ON "body_measurement" USING btree ("user_id","measured_on");--> statement-breakpoint
CREATE INDEX "exercise_user_idx" ON "exercise" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "hit_application_we_idx" ON "hit_application" USING btree ("workout_exercise_id");--> statement-breakpoint
CREATE INDEX "hit_log_app_idx" ON "hit_log" USING btree ("hit_application_id");--> statement-breakpoint
CREATE INDEX "routine_exercise_routine_idx" ON "routine_exercise" USING btree ("routine_id");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "set_log_we_idx" ON "set_log" USING btree ("workout_exercise_id");--> statement-breakpoint
CREATE INDEX "workout_user_status_idx" ON "workout" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "workout_exercise_workout_idx" ON "workout_exercise" USING btree ("workout_id");--> statement-breakpoint
CREATE INDEX "workout_exercise_exercise_idx" ON "workout_exercise" USING btree ("exercise_id");