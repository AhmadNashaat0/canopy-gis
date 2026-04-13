import { env } from "@gis-app/env/worker";

export const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
};
