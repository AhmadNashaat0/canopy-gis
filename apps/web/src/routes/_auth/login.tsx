import { createFileRoute, Navigate } from "@tanstack/react-router";
import { LoginForm } from "@/features/users/components/forms/login-form";
import { authClient } from "@/lib/auth-client";

export const Route = createFileRoute("/_auth/login")({
  component: LoginPage,
});

export default function LoginPage() {
  const { data } = authClient.useSession();
  if (data) {
    return <Navigate to={"/"} />;
  }
  return (
    <div className="grid min-h-svh md:grid-cols-2">
      <div className="flex flex-col gap-4 p-6 md:p-10">
        <div>
          <img src="/logo.png" alt="Canopy Logo" className="h-10 w-auto" />
        </div>
        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-md -translate-y-1/6 md:translate-y-0">
            <LoginForm />
          </div>
        </div>
      </div>
      <div className="hidden p-4 md:block">
        <div className="relative flex h-full items-center justify-center overflow-hidden rounded-2xl bg-custom-primary px-3">
          <img src="/text-logo.avif" alt="Canopy Text Logo" className="h-20" />
        </div>
      </div>
    </div>
  );
}
