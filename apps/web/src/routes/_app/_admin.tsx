import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { LoaderPage } from "@/components/loader-page";
import { isAdmin, type Roles } from "@/features/users/utils";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_app/_admin")({
  component: AdminLayout,
});

function AdminLayout() {
  const { data, isPending, error } = authClient.useSession();

  if (isPending) {
    return <LoaderPage />;
  }

  if (!data || error) {
    return <Navigate replace to={"/login"} />;
  }

  if (!isAdmin(data.user?.role as Roles)) {
    return <Navigate replace to={"/"} />;
  }

  return <Outlet />;
}
