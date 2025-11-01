/* eslint-disable no-console */
import { sql } from "drizzle-orm";
import mqtt from "mqtt";

import db from "@/db/index";
import { readingLog, wormActivity } from "@/db/schema";
import sensorReadings from "@/db/schema/sensor-readings";
import { formatDateLog } from "@/utils/format-date-log";
import { handleRelayFeedback } from "@/utils/get-and-publish-feedback";
import { getLayerType } from "@/utils/get-layer-type";
import { parseLogSeverity } from "@/utils/get-log-type";
import { parsePayloadDefault } from "@/utils/parse-payload";

import type { SystemSettings } from "./types";

import { brokerOptions } from "./constants";
import { SystemStatus } from "./types";

const mqttTopics = [
  "system/settings",
  "system/log",
  "layer/bedding",
  "layer/compost",
  "layer/fluid",
  "layer/worms",
];

let systemStatus: SystemSettings = {
  id: 0,
  status: SystemStatus.idle,
  reading_interval: 0,
  refresh_rate: 0,
};

const client = mqtt.connect(brokerOptions);

client.on("connect", () => {
  console.log("✅ Connected to MQTT broker");
  client.subscribe(mqttTopics, (err) => {
    if (err)
      console.error("❌ Subscription error:", err.message);
    else console.log("📡 Subscribed to topics:", mqttTopics.join(", "));
  });
});

client.on("message", async (topic, messageBuffer) => {
  const rawMessage = messageBuffer.toString();

  try {
    if (topic === "system/settings") {
      handleSystemSettings(rawMessage);
      return;
    }

    switch (topic) {
      case "system/log":
        handleSystemLog(rawMessage);
        break;

      case "layer/bedding":
      case "layer/compost":
      case "layer/fluid":
      { const parsed = JSON.parse(rawMessage);
        await handleLayerData(topic, parsed);
        break; }

      case "layer/worms":
      { const parsed = JSON.parse(rawMessage);
        await handleWormData(parsed);
        break; }

      default:
        console.warn(`⚠️ Unhandled topic: ${topic}`);
    }
  }
  catch (err) {
    console.error(`❌ Failed to handle message on topic ${topic}:`, err);
  }
});

function handleSystemSettings(rawMessage: string) {
  try {
    const payload = JSON.parse(rawMessage);

    if (typeof payload.id !== "undefined") {
      systemStatus.id = Number(payload.id);
    }

    if (typeof payload.status === "string") {
      switch (payload.status.toLowerCase()) {
        case "feeding":
          systemStatus.status = SystemStatus.feeding;
          break;
        case "active":
          systemStatus.status = SystemStatus.active;
          break;
        default:
          systemStatus.status = SystemStatus.idle;
          break;
      }
    }

    if (typeof payload.reading_interval !== "undefined") {
      systemStatus.reading_interval = Number(payload.reading_interval);
    }

    if (typeof payload.refresh_rate !== "undefined") {
      systemStatus.refresh_rate = Number(payload.refresh_rate);
    }
  }
  catch (error) {
    console.error("Invalid system settings message:", error);
  }
}

async function handleSystemLog(message: any) {
  const result = parsePayloadDefault(message);
  if (!result || !result.content || !result.type) {
    console.warn("⚠️ Skipping log: invalid or incomplete payload.", result);
    return;
  }

  const severity = parseLogSeverity(result.type);
  if (!severity) {
    console.warn("⚠️ Skipping log: could not determine severity.", result.type);
    return;
  }

  handleRelayFeedback(result.content, client);

  await db.execute(sql`
    SELECT setval(
      pg_get_serial_sequence('reading_log', 'id'),
      (SELECT COALESCE(MAX(id), 1) FROM reading_log)
    );
  `);

  await db.insert(readingLog).values({
    eventSeverity: severity,
    eventMessage: result.content,
    createdAt: new Date().toISOString(),
  });

  console.log(`✅ Stored system log successfully`);
}

async function handleLayerData(topic: string, data: any) {
  if (systemStatus.status !== SystemStatus.active) {
    console.log(`⏸ Skipped storing: system inactive (${topic})`);
    return;
  }

  const layerMap = {
    "layer/bedding": "bedding",
    "layer/compost": "compost",
    "layer/fluid": "fluid",
  } as const;
  const layer = layerMap[topic as keyof typeof layerMap];
  if (!layer)
    return;

  const now = Date.now();
  try {
    const latest = await db.query.sensorReadings.findFirst({
      where: (sr, { eq }) => eq(sr.layer, getLayerType(layer)),
      orderBy: (sr, { desc }) => [desc(sr.createdAt)],
    });
    if (latest) {
      const last = new Date(latest.createdAt).getTime();
      if (now - last < 10 * 60 * 1000) {
        console.log(
          `⏳ Skipped storing: ${layer} last stored at ${formatDateLog(
            latest.createdAt,
          )}`,
        );
        return;
      }
    }

    await db.execute(sql`
      SELECT setval(
        pg_get_serial_sequence('sensor_readings', 'id'),
        (SELECT MAX(id) FROM sensor_readings)
      );
    `);

    await db.insert(sensorReadings).values({
      layer: getLayerType(layer),
      readings: data,
      createdAt: new Date().toISOString(),
      sensorScheduleId: systemStatus.id,
    });
    console.log(`✅ Stored ${layer} data to database`);
  }
  catch (err) {
    console.error(`❌ Error saving ${layer} data:`, err);
  }
}

async function handleWormData(parsed: any) {
  if (systemStatus.status !== SystemStatus.active) {
    console.log("⏸ Skipped storing: system inactive (worms)");
    return;
  }

  if (
    !parsed.hotspot
    || !Array.isArray(parsed.hotspot)
    || parsed.hotspot.length < 2
    || typeof parsed.hotspot[0] !== "number"
    || typeof parsed.hotspot[1] !== "number"
  ) {
    console.warn("⚠️ Invalid hotspot data, skipping worm activity store:", parsed.hotspot);
    return;
  }

  const wormRecord = {
    wormScheduleId: systemStatus.id,
    avgTemp: parsed.avg_temp,
    minTemp: parsed.min_temp,
    maxTemp: parsed.max_temp,
    thermalSpread: parsed.thermal_spread,
    activityLevel: parsed.activity_level,
    hotspot: { x: parsed.hotspot[0], y: parsed.hotspot[1] },
    zones: parsed.zones,
  };

  const now = Date.now();
  try {
    const latest = await db.query.wormActivity.findFirst({
      orderBy: (wa, { desc }) => [desc(wa.createdAt)],
    });
    if (latest) {
      const last = new Date(latest.createdAt).getTime();
      if (now - last < 10 * 60 * 1000) {
        console.log(
          `⏳ Skipped storing: worm activity last stored at ${formatDateLog(
            latest.createdAt,
          )}`,
        );
        return;
      }
    }

    await db.execute(sql`
      SELECT setval(
        pg_get_serial_sequence('worm_activity', 'id'),
        (SELECT MAX(id) FROM worm_activity)
      );
    `);

    await db.insert(wormActivity).values(wormRecord);
    console.log("✅ Stored worm activity data to database");
  }
  catch (err) {
    console.error("❌ Error saving worm activity data:", err);
  }
}

client.on("reconnect", () => console.log("🔄 Reconnecting to broker..."));
client.on("disconnect", () => {
  console.log("🚫 Disconnected from broker");
  systemStatus.status = SystemStatus.idle;
});
client.on("offline", () => console.log("⚠️ MQTT client offline"));
client.on("error", err => console.error("❌ MQTT error:", err.message));
client.on("close", () => console.log("⚠️ Connection closed"));

export default client;
