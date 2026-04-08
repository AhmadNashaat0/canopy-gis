import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@gis-app/ui/components/dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@gis-app/ui/components/tooltip";
import { createUser } from "../../actions/create-user";
import { UserForm } from "../forms/user-form";

export function CreateUserDialog({
  children,
  tooltipContent,
}: {
  children: React.ReactElement;
  tooltipContent?: string;
}) {
  const [open, setOpen] = useState(false);
  const userMutate = createUser.useMutation({
    onSuccess: () => {
      setOpen(false);
    },
  });
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <Tooltip>
        <TooltipTrigger render={<DialogTrigger render={children} />} />
        {tooltipContent && <TooltipContent>{tooltipContent}</TooltipContent>}
      </Tooltip>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create User</DialogTitle>
          <DialogDescription>Create a new user</DialogDescription>
        </DialogHeader>
        <UserForm closeFn={() => setOpen(false)} userMutate={userMutate} />
      </DialogContent>
    </Dialog>
  );
}
