import { relations } from "drizzle-orm";
import { pgTable, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";

import sensorReadings from "./sensor-readings";
import statusRecords from "./status-records";

export const compostCycle = pgTable("compost_cycle", {
  id: serial("id").primaryKey(),
  createdAt: timestamp("created_at", { mode: "string", precision: 3, withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", precision: 3, withTimezone: true }).$onUpdate(() => new Date().toISOString()),
});

export const compostCycleRelations = relations(compostCycle, ({ many }) => ({
  statusRecords: many(statusRecords),
  sensorReadingValues: many(sensorReadings),
}));

export const selectCompostCycleSchema = createSelectSchema(statusRecords);

export const insertCompostCycleSchema = createInsertSchema(statusRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const patchCompostCycleSchema = insertCompostCycleSchema.partial();

export default compostCycle;
