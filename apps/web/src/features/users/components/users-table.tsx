import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle, Key, MoreHorizontal, Pen, Trash, XCircle } from "lucide-react";
import { DataTable } from "@/components/data-table/data-table";
import { Badge } from "@gis-app/ui/components/badge";
import { Button } from "@gis-app/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuLabel,
} from "@gis-app/ui/components/dropdown-menu";
import { Input } from "@gis-app/ui/components/input";
import type { GetUsers } from "../actions/get-users";
import { DeleteUserDialog } from "./dialogs/delete-user-dialog";
import { ReplaceUserPasswordDialog } from "./dialogs/replace-user-password-dialog";
import { UpdateUserActivationDialog } from "./dialogs/update-user-activation-dialog";
import { UpdateUserDialog } from "./dialogs/update-user-dialog";
import { cn } from "@gis-app/ui/lib/utils";

export const usersTableColumns: ColumnDef<GetUsers["items"][0]>[] = [
  {
    id: "name",
    accessorKey: "name",
    header: "Full Name",
  },
  {
    id: "email",
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => <div className="lowercase">{row.getValue("email")}</div>,
  },
  {
    id: "role",
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => (
      <Badge className="capitalize" variant="secondary">
        {row.original.role}
      </Badge>
    ),
  },
  {
    id: "isActive",
    accessorKey: "isActive",
    header: "Status",
    cell: ({ row }) => (
      <div className="flex gap-1">
        <Badge className="capitalize" variant="secondary">
          <div
            className={cn(
              "size-1.5 rounded-full",
              row.original.isActive ? "bg-green-500" : "bg-red-500",
            )}
          />
          {row.original.isActive ? "Active" : "Inactive"}
        </Badge>
      </div>
    ),
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button className="h-8 w-8 p-0" variant="ghost">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="w-42">
            <DropdownMenuGroup>
              <DropdownMenuLabel className="capitalize">actions</DropdownMenuLabel>
              <UpdateUserDialog id={row.original.id}>
                <DropdownMenuItem closeOnClick={false}>
                  <Pen className="opacity-60" />
                  Edit User
                </DropdownMenuItem>
              </UpdateUserDialog>
              <ReplaceUserPasswordDialog id={row.original.id}>
                <DropdownMenuItem closeOnClick={false}>
                  <Key className="opacity-60" />
                  Update User Password
                </DropdownMenuItem>
              </ReplaceUserPasswordDialog>
              <DropdownMenuSeparator />
              <UpdateUserActivationDialog id={row.original.id} toActive={!row.original.isActive}>
                <DropdownMenuItem closeOnClick={false}>
                  {row.original.isActive ? (
                    <>
                      <XCircle className="opacity-60" />
                      Inactive User
                    </>
                  ) : (
                    <>
                      <CheckCircle className="opacity-60" />
                      Activate User
                    </>
                  )}
                </DropdownMenuItem>
              </UpdateUserActivationDialog>
              <DeleteUserDialog id={row.original.id}>
                <DropdownMenuItem
                  closeOnClick={false}
                  className="text-red-700! hover:bg-red-50! dark:text-red-400! dark:hover:bg-red-900/30!"
                >
                  <Trash className="text-red-700 opacity-60 dark:text-red-400" />
                  Delete User
                </DropdownMenuItem>
              </DeleteUserDialog>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export function UsersTable({ data, isLoading }: { data: GetUsers["items"]; isLoading: boolean }) {
  return (
    <DataTable columns={usersTableColumns} data={data} isLoading={isLoading}>
      {(table) => (
        <div>
          <Input
            className="max-w-72"
            onChange={(event) => table.getColumn("email")?.setFilterValue(event.target.value)}
            placeholder="Filter emails..."
            value={(table.getColumn("email")?.getFilterValue() as string) ?? ""}
          />
        </div>
      )}
    </DataTable>
  );
}
