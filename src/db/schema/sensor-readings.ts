import { relations } from "drizzle-orm";
import { integer, jsonb, pgEnum, pgTable, serial, timestamp } from "drizzle-orm/pg-core";

import compostCycle from "./compost-cycle";

export const layerType = pgEnum("layer_type", ["bedding", "compost", "fluid"]);

export const sensorReadings = pgTable("sensor_readings", {
  id: serial("id").primaryKey(),
  layer: layerType("layer").notNull(),
  readings: jsonb("readings").notNull(),
  createdAt: timestamp("created_at", {
    mode: "string",
    precision: 3,
    withTimezone: true,
  })
    .defaultNow()
    .notNull(),
  sensorScheduleId: integer("sensor_schedule_id"),
});

export const sensorReadingsRelations = relations(sensorReadings, ({ one }) => ({
  sensorScheduleId: one(compostCycle, {
    fields: [sensorReadings.sensorScheduleId],
    references: [compostCycle.id],
  }),
}));

export default sensorReadings;
