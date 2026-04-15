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

    AWS_REGION: z.string().min(1),
    AWS_S3_BUCKET_BASIS_LAYERS: z.string().min(1),
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    AWS_S3_PREFIX: z.string().default("gis/basis-layers"),
    AWS_S3_PUBLIC_BASE_URL: z.string().optional(),
  },
  runtimeEnv: process.env,
  emptyStringAsUndefined: true,
});
