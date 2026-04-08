import { rolesList } from "@gis-app/db/schema/auth";
import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

export const roles = rolesList;

const statement = {
  ...defaultStatements,
} as const;

export const ac = createAccessControl(statement);

export const admin = ac.newRole({
  user: adminAc.statements.user,
  session: adminAc.statements.session,
});

export const user = ac.newRole({
  user: [],
  session: [],
});
