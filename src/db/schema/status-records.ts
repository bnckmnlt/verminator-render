import { pgEnum, pgTable, serial, timestamp } from "drizzle-orm/pg-core";

export const cycleStatus = pgEnum("cycle_status", ["initial", "processing", "ready", "released"]);

export const statusRecords = pgTable("status_records", {
  id: serial("id").primaryKey(),
  status: cycleStatus(),
  createdAt: timestamp("created_at", { mode: "string", precision: 3, withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string", precision: 3, withTimezone: true }).$onUpdate(() => new Date().toISOString()),
});

export default statusRecords;
