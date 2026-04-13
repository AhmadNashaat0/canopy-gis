import "dotenv/config";
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().min(1),
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.url(),
    CORS_ORIGIN: z.url(),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    ADMIN_EMAIL: z.email().optional(),
    USER_EMAIL: z.email().optional(),
    EMAIL_PASSWORD: z.string().optional(),
    BULLMQ_PORT: z.string().default("4000"),
    REDIS_PORT: z.coerce.number().default(6379),
    REDIS_HOST: z.string(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
