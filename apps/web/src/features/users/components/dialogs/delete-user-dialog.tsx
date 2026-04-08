import { useState } from "react";
import { DeleteDialog } from "@/components/delete-dialog";
import { deleteUser } from "../../actions/delete-user";

export function DeleteUserDialog({
  id,
  tooltipContent,
  children,
}: {
  id: string;
  tooltipContent?: string;
  children: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const deletUserMutate = deleteUser.useMutation({
    id,
    onSuccess: () => setOpen(false),
  });
  return (
    <DeleteDialog
      deleteMutate={deletUserMutate}
      title="Delete User"
      description="Are you sure you want to delete this user?"
      onOpenChange={setOpen}
      open={open}
      tooltipContent={tooltipContent}
    >
      {children}
    </DeleteDialog>
  );
}
