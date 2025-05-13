import { relations } from "drizzle-orm";
import { doublePrecision, index, integer, jsonb, pgEnum, pgTable, point, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

import compostSchedule from "./compost-cycle";

export const activityLevel = pgEnum("activity_level_enum", ["low", "moderate", "high"]);

const wormActivity = pgTable("worm_activity", {
  id: serial("id").primaryKey(),
  wormScheduleId: integer("worm_schedule_id"),
  avgTemp: doublePrecision("avg_temp").notNull(),
  minTemp: doublePrecision("min_temp").notNull(),
  maxTemp: doublePrecision("max_temp").notNull(),
  thermalSpread: doublePrecision("thermal_spread").notNull(),
  activityLevel: activityLevel("activity_level"),
  hotspot: point("hotspot", { mode: "xy" }),
  zones: jsonb("zones").notNull(),
  createdAt: timestamp("created_at", {
    mode: "string",
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
}, table => [
  index("worm_schedule_id_idx").on(table.wormScheduleId),
  index("activity_level_idx").on(table.activityLevel),
]);

export const wormActivityRelations = relations(wormActivity, ({ one }) => ({
  wormSchedule: one(compostSchedule, {
    fields: [wormActivity.wormScheduleId],
    references: [compostSchedule.id],
  }),
}));

export const selectWormActivitySchema = createSelectSchema(wormActivity);

export const insertWormActivitySchema = createInsertSchema(wormActivity)
  .required({
    avgTemp: true,
    minTemp: true,
    maxTemp: true,
    thermalSpread: true,
    activityLevel: true,
    hotspot: true,
    zones: true,
  })
  .omit({
    createdAt: true,
  });

export const patchWormActivitySchema = createUpdateSchema(wormActivity)
  .pick({
    avgTemp: true,
    minTemp: true,
    maxTemp: true,
    thermalSpread: true,
    activityLevel: true,
    hotspot: true,
    zones: true,
  });

export default wormActivity;
