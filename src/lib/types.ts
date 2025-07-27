import type { OpenAPIHono } from "@hono/zod-openapi";
import type { PinoLogger } from "hono-pino";

export interface AppBindings {
  Variables: {
    logger: PinoLogger;
  };
}

export type AppOpenAPI = OpenAPIHono<AppBindings>;

export interface SystemSettings {
  id: number;
  status: boolean;
  reading_interval: number;
  refresh_rate: number;
}
