import type { IClientOptions } from "mqtt";

import env from "@/env";

export const brokerOptions: IClientOptions = {
  clientId: `render_client_${Math.random().toString(16).slice(2)}`,
  host: env.HIVEMQ_CLUSTER_URL,
  port: 8883,
  protocol: "mqtts",
  clean: true,
  keepalive: 30,
  reconnectPeriod: 5000,
  connectTimeout: 30 * 1000,
  username: env.HIVEMQ_USERNAME,
  password: env.HIVEMQ_PASSWORD,
  resubscribe: true,
};

export const STORE_INTERVAL_MS = 30 * 1000;

export const lastStoredTimestamps: { [key: string]: number } = {};
