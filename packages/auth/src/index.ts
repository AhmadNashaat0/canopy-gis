import { createDb } from "@gis-app/db";
import * as schema from "@gis-app/db/schema/auth";
import { env } from "@gis-app/env/server";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin as adminPlugin } from "better-auth/plugins";
import { admin, user, ac } from "./roles";

export function createAuth() {
  const db = createDb();

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema,
    }),
    trustedOrigins: [env.CORS_ORIGIN],
    emailAndPassword: {
      enabled: true,
    },
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    advanced: {
      defaultCookieAttributes: {
        sameSite: "none",
        secure: true,
        httpOnly: true,
      },
    },
    user: {
      additionalFields: {
        isActive: {
          type: "boolean",
          required: true,
          input: true,
          default: true,
        },
      },
    },
    plugins: [
      adminPlugin({
        ac,
        roles: {
          admin,
          user,
        },
      }),
    ],
  });
}

export const auth = createAuth();
