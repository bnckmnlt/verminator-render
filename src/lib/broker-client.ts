/* eslint-disable no-console */
import mqtt from "mqtt";

import db from "@/db";
import sensorReadings from "@/db/schema/schema";
import env from "@/env";
import { getLayerType } from "@/utils/get-layer-type";

import { brokerOptions, lastStoredTimestamps } from "./constants";

const mqttTopics = ["system/status", "layer/bedding", "layer/compost", "layer/fluid"];

const client = mqtt.connect(env.HIVEMQ_CLUSTER_URL, brokerOptions);

client.on("connect", () => {
  console.log("✅ Connected successfully");

  client.subscribe(mqttTopics, (err) => {
    if (err) {
      console.error("❌ Subscription error:", err.message);
    }
    else {
      console.log("📡 Subscribed to topics:", mqttTopics.join(", "));
    }
  });
});

client.on("message", async (topic: string, message) => {
  console.log(`📩 Received message on ${topic}: ${message.toString()}`);

  let parsedMessage;
  try {
    parsedMessage = JSON.parse(message.toString());
  }
  catch (error) {
    console.error("❌ Error parsing JSON message:", error);
    return;
  }

  const layerMap: { [key: string]: string } = {
    "layer/bedding": "bedding",
    "layer/compost": "compost",
    "layer/fluid": "fluid",
  };

  const layer = layerMap[topic];
  if (!layer)
    return;

  const currentTime = Date.now();
  const lastStoredTime = lastStoredTimestamps[layer] || 0;

  if (currentTime - lastStoredTime < 30000) {
    console.log(`⏳ Skipping storing for ${layer} layer, last stored less than 30 seconds ago.`);
    return;
  }

  try {
    const layerEnum = getLayerType(layer);

    await db.insert(sensorReadings).values({
      layer: layerEnum,
      readings: parsedMessage,
      createdAt: new Date().toISOString(),
    });

    lastStoredTimestamps[layer] = currentTime;
    console.log(`✅ Stored sensor readings for ${layer} layer.`);
  }
  catch (error) {
    console.error("❌ Error storing sensor data:", error);
  }
});

client.on("reconnect", () => {
  console.log("🔄 Reconnecting to broker...");
});

client.on("disconnect", () => {
  console.log("🚫 Disconnected from broker");
});

client.on("offline", () => {
  console.log("⚠️ Broker client is offline");
});

client.on("error", (error) => {
  console.error(`❌ Broker client error: ${error.message}`);
});

client.on("close", () => {
  console.log("⚠️ Connection lost. Attempting to reconnect...");
  client.reconnect();
});

export default client;
