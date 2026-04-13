import { env } from "@gis-app/env/server";

export const connection = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
};
