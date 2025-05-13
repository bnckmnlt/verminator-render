import { relations } from "drizzle-orm";
import { boolean, integer, pgEnum, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

import compostSchedule from "./compost-schedule";

export const scheduleStatus = pgEnum("schedule_status", ["initial", "active", "ready", "released"]);

const statusRecord = pgTable("status_records", {
  id: serial("id").primaryKey(),
  statusScheduleId: integer("status_schedule_id").references(() => compostSchedule.id).notNull(),
  status: scheduleStatus("status").notNull().default("initial"),
  remarks: text("remarks"),
  isCompleted: boolean("is_completed").notNull().default(false),
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
  uniqueIndex("unique_status_per_schedule").on(table.statusScheduleId, table.status),
]);

export const statusRecordRelations = relations(statusRecord, ({ one }) => ({
  scheduleStatus: one(compostSchedule, {
    fields: [statusRecord.statusScheduleId],
    references: [compostSchedule.id],
  }),
}));

export const selectStatusRecordSchema = createSelectSchema(statusRecord);

export const insertStatusRecordSchema = createInsertSchema(statusRecord)
  .required({
    statusScheduleId: true,
    status: true,
  })
  .omit({
    id: true,
    isCompleted: true,
    createdAt: true,
    updatedAt: true,
  });

export const patchStatusRecordSchema = createUpdateSchema(statusRecord).pick({
  isCompleted: true,
  remarks: true,
});

export default statusRecord;
