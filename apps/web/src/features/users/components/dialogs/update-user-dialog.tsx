import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@gis-app/ui/components/dialog";
import { Spinner } from "@gis-app/ui/components/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@gis-app/ui/components/tooltip";
import { type GetUser, getUser } from "../../actions/get-user";
import { updateUser } from "../../actions/update-user";
import { UserForm } from "../forms/user-form";

export function UpdateUserDialog({
  children,
  id,
  tooltipContent,
}: {
  children: React.ReactElement;
  id: string;
  tooltipContent?: string;
}) {
  const [open, setOpen] = useState(false);
  const { data: user, isLoading } = getUser.useQuery({ id }, { enabled: open });
  const userMutate = updateUser.useMutation({
    id,
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
          <div className="flex items-center gap-2">
            <DialogTitle>Update User</DialogTitle>
            {isLoading && <Spinner className="size-3" />}
          </div>
          <DialogDescription>update an existing user data</DialogDescription>
        </DialogHeader>
        <UserForm
          closeFn={() => setOpen(false)}
          key={user?.id}
          userDefaultValues={user ?? ({} as GetUser)}
          userMutate={userMutate}
        />
      </DialogContent>
    </Dialog>
  );
}
