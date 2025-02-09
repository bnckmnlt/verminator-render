import configureOpenAPI from "./lib/configure-open-api";
import createApp from "./lib/create-app";

const app = createApp();

configureOpenAPI(app);

export default app;
