import { Authorization } from "@/features/users/components/authorization";
import UserMenu from "@/features/users/components/user-menu";
import { Link } from "@tanstack/react-router";

export function AppNavbar() {
  return (
    <div className="flex items-center justify-between border-b px-4 h-full">
      <div className="flex items-center gap-4">
        <div className="flex items-center">
          <img src="/logo.png" alt="Canopy Logo" className="h-8 w-auto" />
          {/* <h2 className="font-bold">Canopy</h2> */}
        </div>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground text-sm font-medium">
        <Link
          to="/"
          activeProps={{
            className: "text-primary",
          }}
        >
          Home
        </Link>
        <Authorization allowedRoles={["admin"]}>
          <Link
            to="/users"
            activeProps={{
              className: "text-primary",
            }}
          >
            Users
          </Link>
        </Authorization>
      </div>
      <div className="flex items-center gap-2">
        <UserMenu />
      </div>
    </div>
  );
}
