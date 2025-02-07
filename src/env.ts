import { config } from "dotenv";
import { expand } from "dotenv-expand";
import path from "path";
import { z } from "zod";

expand(config({path: path.resolve(
    process.cwd(),
    process.env.NODE_ENV === "test" ? ".env.test" : ".env"
  )
}))

const EnvSchema = z.object({
  NODE_ENV: z.string().default("development"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]),
  PORT: z.coerce.number(),
  DATABASE_URL: z.string().url(),
  DATABASE_AUTH_TOKEN: z.string().optional(),
  HIVEMQ_CLUSTER_URL: z.string(),
  HIVEMQ_USERNAME: z.string(),
  HIVEMQ_PASSWORD: z.string(),
}).superRefine((input, ctx) => {
  if (input.NODE_ENV === "production" && !input.DATABASE_AUTH_TOKEN) {
    ctx.addIssue({
      code: z.ZodIssueCode.invalid_type,
      expected: "string",
      received: "undefined",
      path: ["DATABASE_AUTH_TOKEN"],
      message: "Must be set when NODE_ENV is 'production'",
    });
  }
});

export type Environment = z.infer<typeof EnvSchema>;

// eslint-disable-next-line node/no-process-env
const { data: env, error } = EnvSchema.safeParse(process.env);

if (error) {
  console.error("❌ Invalid env: ");
  console.error(JSON.stringify(error.flatten().fieldErrors), null, 2);
  process.exit(1);
}

export default env!;
