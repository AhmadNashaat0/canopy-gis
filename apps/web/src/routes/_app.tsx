import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppNavbar } from "@/components/app-navbar";
import { ProtectedRoute } from "@/features/users/components/protected-route";

export const Route = createFileRoute("/_app")({
  component: AppLayout,
});

function AppLayout() {
  return (
    <ProtectedRoute>
      <main className="min-h-svh">
        <section className="h-12">
          <AppNavbar />
        </section>
        <section className="h-[calc(100svh-3rem)]">
          <Outlet />
        </section>
      </main>
    </ProtectedRoute>
  );
}
