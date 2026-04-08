import { roles } from "@gis-app/auth/roles";

export const rolesList = roles;
export type Roles = (typeof rolesList)[number];

export function isAdmin(role: Roles) {
  if (!rolesList.includes(role)) {
    return false;
  }
  return role === "admin";
}

export function isUser(role: Roles) {
  if (!rolesList.includes(role)) {
    return false;
  }
  return role === "user";
}
