import type { IClientOptions } from "mqtt";

import env from "@/env";

export const brokerOptions: IClientOptions = {
  clientId: `broker_api_${Math.random().toString(16).substr(2, 8)}`,
  protocol: "mqtts",
  reconnectPeriod: 2000,
  connectTimeout: 30 * 1000,
  clean: false,
  username: env.HIVEMQ_USERNAME,
  password: env.HIVEMQ_PASSWORD,
  resubscribe: true,
};

export const STORE_INTERVAL_MS = 30 * 1000;

export const lastStoredTimestamps: { [key: string]: number } = {};
