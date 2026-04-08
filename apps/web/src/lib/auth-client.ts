import { env } from "@gis-app/env/web";
import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { ac, admin, user } from "@gis-app/auth/roles";

export const authClient = createAuthClient({
  baseURL: env.VITE_SERVER_URL,
  plugins: [
    adminClient({
      ac,
      roles: {
        admin,
        user,
      },
    }),
  ],
});
