import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    BULLMQ_PORT: z.string().default("4000"),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_HOST: z.string(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
