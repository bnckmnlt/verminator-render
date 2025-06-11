/* eslint-disable no-console */
import mqtt from "mqtt";

import db from "@/db/index";
import { wormActivity } from "@/db/schema";
import sensorReadings from "@/db/schema/sensor-readings";
import { formatDateLog } from "@/utils/format-date-log";
import { getLayerType } from "@/utils/get-layer-type";

import { brokerOptions } from "./constants";

const mqttTopics = [
  "system/status",
  "system/current_cycle",
  "layer/bedding",
  "layer/compost",
  "layer/fluid",
  "layer/worms",
];

let currentCycle = 1;
let isActive = false;

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
    if (topic === "system/status") {
      handleSystemStatus(rawMessage);
      return;
    }

    const parsed = JSON.parse(rawMessage);

    switch (topic) {
      case "system/current_cycle":
        handleCurrentCycle(parsed);
        break;

      case "layer/bedding":
      case "layer/compost":
      case "layer/fluid":
        await handleLayerData(topic, parsed);
        break;

      case "layer/worms":
        await handleWormData(parsed);
        break;

      default:
        console.warn(`⚠️ Unhandled topic: ${topic}`);
    }
  }
  catch (err) {
    console.error(`❌ Failed to handle message on topic ${topic}:`, err);
  }
});

function handleCurrentCycle(value: any) {
  const cycle = Number(value);
  if (!Number.isNaN(cycle) && cycle > 0) {
    currentCycle = cycle;
    console.log(`🔄 Current cycle updated: ${currentCycle}`);
  }
  else {
    console.warn(`⚠️ Invalid cycle value: ${value}`);
  }
}

function handleSystemStatus(status: string) {
  const clean = status.trim().toLowerCase();
  if (clean === "active") {
    isActive = true;
    console.log("✅ System is now active");
  }
  else if (clean === "idle" || clean === "feeding") {
    isActive = false;
    console.log("❌ System is now inactive");
  }
  else {
    console.warn(`⚠️ Unknown system status: ${clean}`);
  }
}

async function handleLayerData(topic: string, data: any) {
  if (!isActive) {
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
      if (now - last < 5 * 60 * 1000) {
        console.log(
          `⏳ Skipped storing: ${layer} last stored at ${formatDateLog(
            latest.createdAt,
          )}`,
        );
        return;
      }
    }

    await db.insert(sensorReadings).values({
      layer: getLayerType(layer),
      readings: data,
      createdAt: new Date().toISOString(),
      sensorScheduleId: currentCycle,
    });
    console.log(`✅ Stored ${layer} data to database`);
  }
  catch (err) {
    console.error(`❌ Error saving ${layer} data:`, err);
  }
}

async function handleWormData(parsed: any) {
  if (!isActive) {
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
    wormScheduleId: currentCycle,
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
      if (now - last < 5 * 60 * 1000) {
        console.log(
          `⏳ Skipped storing: worm activity last stored at ${formatDateLog(
            latest.createdAt,
          )}`,
        );
        return;
      }
    }

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
  isActive = false;
});
client.on("offline", () => console.log("⚠️ MQTT client offline"));
client.on("error", err => console.error("❌ MQTT error:", err.message));
client.on("close", () => console.log("⚠️ Connection closed"));

export default client;
