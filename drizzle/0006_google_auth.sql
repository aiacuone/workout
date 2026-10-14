ALTER TABLE "user" ADD COLUMN "email" text;
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "google_sub" text;
--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "password_hash";
--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_email_unique" UNIQUE("email");
--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_google_sub_unique" UNIQUE("google_sub");
