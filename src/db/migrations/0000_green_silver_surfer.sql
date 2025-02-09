CREATE TYPE "public"."layer_type" AS ENUM('bedding', 'compost', 'fluid');--> statement-breakpoint
CREATE TABLE "sensor_readings" (
	"id" serial PRIMARY KEY NOT NULL,
	"layer" "layer_type" NOT NULL,
	"readings" jsonb NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
