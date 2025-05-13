import { relations } from "drizzle-orm";
import { index, integer, jsonb, pgEnum, pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import compostSchedule from "./compost-cycle";

export const layerType = pgEnum("layer_type", ["bedding", "compost", "fluid"]);

export const sensorReadings = pgTable("sensor_readings", {
  id: serial("id").primaryKey(),
  sensorScheduleId: integer("sensor_schedule_id"),
  layer: layerType("layer").notNull(),
  readings: jsonb("readings").notNull(),
  createdAt: timestamp("created_at", {
    mode: "string",
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
}, table => [
  index("sensor_schedule_id_idx").on(table.sensorScheduleId),
  index("layer_idx").on(table.layer),
  index("created_at_idx").on(table.createdAt),
]);

export const sensorReadingsRelations = relations(sensorReadings, ({ one }) => ({
  sensorSchedule: one(compostSchedule, {
    fields: [sensorReadings.sensorScheduleId],
    references: [compostSchedule.id],
  }),
}));

export const selectSensorReadingsSchema = createSelectSchema(sensorReadings);

export const insertSensorReadingsSchema = createInsertSchema(sensorReadings)
  .required({
    sensorScheduleId: true,
    layer: true,
    readings: true,
  })
  .omit({
    id: true,
    createdAt: true,
  });

export const patchSensorReadingsSchema = insertSensorReadingsSchema.partial();

export default sensorReadings;
