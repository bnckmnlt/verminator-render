import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCode from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createMessageObjectSchema } from "stoker/openapi/schemas";

import { createRouter } from "@/lib/create-app";

const router = createRouter().openapi(createRoute({
  tags: ["Index"],
  method: "get",
  path: "/",
  responses: {
    [HttpStatusCode.OK]: jsonContent(
      createMessageObjectSchema("Verminator Broker API"),
      "Verminator Broker API Index",
    ),
  },
}), (c) => {
  return c.json({
    message: "Verminator Broker API",
  }, HttpStatusCode.OK);
});

export default router;
