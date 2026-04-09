import { createFileRoute } from "@tanstack/react-router";
import { Plus, Users } from "lucide-react";
import { Button } from "@gis-app/ui/components/button";
import { getUsers } from "@/features/users/actions/get-users";
import { CreateUserDialog } from "@/features/users/components/dialogs/create-user-dialog";
import { UsersTable } from "@/features/users/components/users-table";

export const Route = createFileRoute("/_app/_admin/users/")({
  component: RouteComponent,
});

function RouteComponent() {
  const { data, isLoading } = getUsers.useQuery();
  return (
    <main className="max-w-7xl mx-auto border-x h-full">
      <header>
        <div className="flex gap-2 items-center justify-between border-b px-3 py-2">
          <div className="flex gap-4 items-center flex-1">
            <div className="hidden size-10 shrink-0 items-center justify-center rounded-lg border bg-card sm:flex">
              <Users className="size-4.5 opacity-60" />
            </div>
            <div className="flex flex-col">
              <h3 className="line-clamp-1 break-all font-bold text-xl">
                Users <sup className="ms-1.5 text-muted-foreground text-xs">[{data?.count}]</sup>
              </h3>
              <p className="line-clamp-1 break-all text-muted-foreground text-sm">
                Manage GIS users
              </p>
            </div>
          </div>
          <CreateUserDialog>
            <Button size={"sm"}>
              <Plus /> Create User
            </Button>
          </CreateUserDialog>
        </div>
      </header>
      <div className="flex-1 px-3 py-4">
        <UsersTable data={data?.items ?? []} isLoading={isLoading} />
      </div>
    </main>
  );
}
