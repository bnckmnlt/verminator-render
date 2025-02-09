import { jsonb, pgEnum, pgTable, serial, timestamp } from "drizzle-orm/pg-core";

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
});

export default sensorReadings;
