import { authClient } from "@/lib/auth-client";
import type { Roles } from "../utils";

export function Authorization({
  allowedRoles,
  children,
}: {
  allowedRoles?: Roles[];
  children: React.ReactNode;
}) {
  const { data } = authClient.useSession();
  if (!allowedRoles) {
    return children;
  }
  if (data && allowedRoles?.includes(data?.user?.role as Roles)) {
    return children;
  }
  return null;
}
