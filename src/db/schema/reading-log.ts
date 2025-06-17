import { pgEnum, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-zod";

export const logSeverity = pgEnum("log_severity", ["warn", "info", "error", "fatal"]);

export type LogSeverity = typeof logSeverity.enumValues[number];

const readingLog = pgTable("reading_log", {
  id: serial("id").primaryKey(),
  eventSeverity: logSeverity("log_severity"),
  eventMessage: text("event_message").notNull(),
  createdAt: timestamp("created_at", {
    mode: "string",
    precision: 3,
    withTimezone: true,
  })
    .notNull()
    .defaultNow(),
});

export const selectReadingLogSchema = createSelectSchema(readingLog);

export const insertReadingLogSchema = createInsertSchema(readingLog)
  .required({
    eventSeverity: true,
    eventMessage: true,
  })
  .omit({
    id: true,
    createdAt: true,
  });

export const patchReadingLogSchema = createUpdateSchema(readingLog)
  .pick({
    eventSeverity: true,
    eventMessage: true,
  });

export default readingLog;
