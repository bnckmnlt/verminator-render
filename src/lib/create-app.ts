import { appLogger } from "@/middlewares/app-logger";
import { OpenAPIHono } from "@hono/zod-openapi";
import { notFound, onError, serveEmojiFavicon } from "stoker/middlewares";
import { defaultHook } from "stoker/openapi";

import type { AppBindings } from "./types";

export function createRouter() {
  return new OpenAPIHono<AppBindings>({
    strict: false,
    defaultHook,
  });
}

export default function createApp() {
  const app = createRouter();

  app.use(serveEmojiFavicon("🐧"));
  app.use(appLogger());

  app.notFound(notFound);
  app.onError(onError);

  return app;
}
