import { serve } from "@hono/node-server";

import app from "./app";
import "./lib/broker-client";
import env from "./env";

const PORT = Number(env.PORT || 3000);

serve({ fetch: app.fetch, port: PORT }, () => {
  // eslint-disable-next-line no-console
  console.log(`🚀 Server running on PORT: ${PORT}`);
});
