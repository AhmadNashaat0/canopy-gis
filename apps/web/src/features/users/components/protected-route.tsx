import { Navigate, useLocation } from "@tanstack/react-router";
import { LoaderPage } from "@/components/loader-page";
import { authClient } from "@/lib/auth-client";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { data, isPending, error } = authClient.useSession();
  // Guard
  if (location.pathname === "/login") {
    return children;
  }

  if (isPending) {
    return <LoaderPage />;
  }

  if (!data || error) {
    return (
      <Navigate
        replace
        search={{
          redirectTo: location.pathname,
        }}
        to={"/login"}
      />
    );
  }

  return children;
};
