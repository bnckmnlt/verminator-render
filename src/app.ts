import mqtt from "mqtt";

import configureOpenAPI from "./lib/configure-open-api";
import createApp from "./lib/create-app";

import env from "@/env";

const app = createApp();

configureOpenAPI(app);

const client = mqtt.connect(env.HIVEMQ_CLUSTER_URL, {
  protocol: "mqtts",
  username: env.HIVEMQ_USERNAME,
  password: env.HIVEMQ_PASSWORD,
});

client.on("connect", () => {
  client.subscribe("test/hello");
});

client.on("message", (topic, message) => {
  // eslint-disable-next-line no-console
  console.log(`Received message on topic ${topic}: ${message.toString()}`);
});

export default app;
