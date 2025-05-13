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
  "layer/bedding",
  "layer/compost",
  "layer/fluid",
  "layer/worms",
  "system/current_cycle",
];

let currentCycle = 1;
let isActive = false;

const client = mqtt.connect(brokerOptions);

client.on("connect", () => {
  console.log("✅ Connected to MQTT broker");

  client.subscribe(mqttTopics, (err) => {
    if (err) {
      console.error("❌ Subscription error:", err.message);
    }
    else {
      console.log("📡 Subscribed to topics:", mqttTopics.join(", "));
    }
  });
});

client.on("message", async (topic, messageBuffer) => {
  const rawMessage = messageBuffer.toString();
  // console.log(`📩 ${topic}: ${rawMessage}`);

  try {
    if (topic === "system/status") {
      handleSystemStatus(rawMessage);
      return;
    }

    const parsed = JSON.parse(rawMessage);

    if (topic === "system/current_cycle") {
      handleCurrentCycle(parsed);
    }
    else if (
      topic === "layer/bedding"
      || topic === "layer/compost"
      || topic === "layer/fluid"
    ) {
      await handleLayerData(topic, parsed);
    }
    else if (topic === "layer/worms") {
      const wormData = {
        wormScheduleId: currentCycle,
        avgTemp: parsed.avg_temp,
        minTemp: parsed.min_temp,
        maxTemp: parsed.max_temp,
        thermalSpread: parsed.thermal_spread,
        activityLevel: parsed.activity_level,
        hotspot: { x: parsed.hotspot[0], y: parsed.hotspot[1] },
        zones: parsed.zones,
      };
      await handleWormActivityData(wormData);
    }
    else {
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
  const cleanStatus = status.trim().toLowerCase();
  if (cleanStatus === "active") {
    isActive = true;
    console.log("✅ System is now active");
  }
  else if (cleanStatus === "inactive") {
    isActive = false;
    console.log("❌ System is now inactive");
  }
  else {
    console.warn(`⚠️ Unknown system status: ${cleanStatus}`);
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

  const layer = topic in layerMap ? layerMap[topic as keyof typeof layerMap] : undefined;

  if (!layer)
    return;

  if (!isActive) {
    console.log(`⏸ Skipped storing: system inactive (${layer})`);
    return;
  }

  const now = Date.now();

  try {
    const latest = await db.query.sensorReadings.findFirst({
      where: (sensorReadings, { eq }) => eq(sensorReadings.layer, getLayerType(layer)),
      orderBy: (sensorReadings, { desc }) => [desc(sensorReadings.createdAt)],
    });

    if (latest) {
      const lastCreatedAt = new Date(latest.createdAt).getTime();

      if (now - lastCreatedAt < 5 * 60 * 1000) {
        console.log(`⏳ Skipped storing: ${layer} last stored at ${formatDateLog(latest.createdAt)}`);
        return;
      }
    }

    // Insert new reading
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

async function handleWormActivityData(data: any) {
  if (!isActive) {
    console.log(`⏸ Skipped storing: system inactive (worms monitoring)`);
    return;
  }

  const now = Date.now();

  try {
    const latest = await db.query.wormActivity.findFirst({
      orderBy: (wormActivity, { desc }) => [desc(wormActivity.createdAt)],
    });

    if (latest) {
      const lastCreatedAt = new Date(latest.createdAt).getTime();

      if (now - lastCreatedAt < 5 * 60 * 1000) {
        console.log(`⏳ Skipped storing: worm activity last stored at ${formatDateLog(latest.createdAt)}`);
        return;
      }
    }

    await db.insert(wormActivity).values(data);

    console.log(`✅ Stored worm activity data to database`);
  }
  catch (err) {
    console.error(`❌ Error saving worm activity data:`, err);
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
