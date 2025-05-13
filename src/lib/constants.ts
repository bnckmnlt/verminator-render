import type { IClientOptions } from "mqtt";

import env from "@/env";

export const brokerOptions: IClientOptions = {
  clientId: `render_client`,
  host: env.HIVEMQ_CLUSTER_URL,
  port: 8883,
  protocol: "mqtts",
  clean: false,
  username: env.HIVEMQ_USERNAME,
  password: env.HIVEMQ_PASSWORD,
  resubscribe: true,
};

export const STORE_INTERVAL_MS = 30 * 1000;

export const lastStoredTimestamps: { [key: string]: number } = {};
