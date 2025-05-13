import { eq, relations } from "drizzle-orm";
import { boolean, index, pgTable, pgView, serial, timestamp, uniqueIndex, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

import sensorReadings from "./sensor-readings";
import statusRecords from "./status-records";

const compostCycle = pgTable("compost_schedule", {
  id: serial("id").primaryKey(),
  scheduleName: varchar("schedule_name", { length: 255 }).notNull(),
  compostProduced: varchar("compost_produced", { length: 255 }),
  juiceProduced: varchar("juice_produced", { length: 255 }),
  isCompleted: boolean("is_completed").default(false).notNull(),
  dateReleased: timestamp("date_released", {
    mode: "string",
    precision: 3,
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", {
    mode: "string",
    precision: 3,
    withTimezone: true,
  }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", {
    mode: "string",
    precision: 3,
    withTimezone: true,
  }).$onUpdateFn(() => new Date().toISOString()),
}, table => [
  uniqueIndex("schedule_name_unique").on(table.scheduleName),
  index("is_completed_idx").on(table.isCompleted),
]);

export const compostCycleRelations = relations(compostCycle, ({ many }) => ({
  statusRecords: many(statusRecords),
  sensorReadings: many(sensorReadings),
}));

export const selectcompostCycleSchema = createSelectSchema(compostCycle);

export const insertcompostCycleSchema = createInsertSchema(compostCycle, {
  scheduleName: schema => schema.min(6).max(255),
})
  .required({
    scheduleName: true,
  })
  .omit({
    id: true,
    isCompleted: true,
    createdAt: true,
    updatedAt: true,
  });

export const patchcompostCycleSchema = createUpdateSchema(compostCycle)
  .pick({
    scheduleName: true,
    compostProduced: true,
    juiceProduced: true,
    isCompleted: true,
    dateReleased: true,
  });

export const compostCycleView = pgView("compost_schedule_view").as(qb => qb.select().from(compostCycle).fullJoin(statusRecords, eq(statusRecords.statusScheduleId, compostCycle.id)));

export default compostCycle;
