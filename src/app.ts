import index from "@/routes/index.route";

import configureOpenAPI from "./lib/configure-open-api";
import createApp from "./lib/create-app";

const app = createApp();

configureOpenAPI(app);

const routes = [
  index,
];

routes.forEach((route) => {
  app.route("/", route);
});

export type AppType = typeof routes[number];

export default app;
