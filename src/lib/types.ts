import type { OpenAPIHono } from "@hono/zod-openapi";
import type { PinoLogger } from "hono-pino";

export interface AppBindings {
  Variables: {
    logger: PinoLogger;
  };
}

export type AppOpenAPI = OpenAPIHono<AppBindings>;

export enum SystemStatus {
  feeding,
  idle,
  active,
}

export interface SystemSettings {
  id: number;
  status: SystemStatus;
  reading_interval: number;
  refresh_rate: number;
}
