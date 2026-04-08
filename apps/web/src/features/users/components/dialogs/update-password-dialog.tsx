import { Key } from "lucide-react";
import { useState } from "react";
import { Button } from "@gis-app/ui/components/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@gis-app/ui/components/dialog";
import { Spinner } from "@gis-app/ui/components/spinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@gis-app/ui/components/tooltip";
import { updateUserPassword } from "../../actions/update-user-password";
import { UpdatePasswordForm } from "../forms/update-password-form";

export function UpdatePasswordDialog({
  children,
  tooltipContent,
}: {
  children: React.ReactElement;
  tooltipContent?: string;
}) {
  const [open, setOpen] = useState(false);
  const updatePasswordMutate = updateUserPassword.useMutation({
    onSuccess: () => setOpen(false),
  });
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <Tooltip>
        <TooltipTrigger render={<DialogTrigger render={children} />} />
        {tooltipContent && <TooltipContent>{tooltipContent}</TooltipContent>}
      </Tooltip>
      <DialogContent>
        <DialogHeader className="flex items-center justify-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900">
            <Key className="size-5 text-orange-600 dark:text-orange-300" />
          </div>
          <div className="space-y-1 text-center">
            <DialogTitle>Update Your Password</DialogTitle>
            <DialogDescription>Are you sure you want to update your password?</DialogDescription>
          </div>
        </DialogHeader>
        <UpdatePasswordForm updatePasswordMutate={updatePasswordMutate}>
          <DialogFooter>
            <DialogClose
              render={
                <Button
                  className="capitalize"
                  disabled={updatePasswordMutate.isPending}
                  type="button"
                  variant="outline"
                >
                  Cancel
                </Button>
              }
            />
            <Button className="capitalize" disabled={updatePasswordMutate.isPending} type="submit">
              {"Confirm "}
              {updatePasswordMutate.isPending && <Spinner className="h-4 w-4" />}
            </Button>
          </DialogFooter>
        </UpdatePasswordForm>
      </DialogContent>
    </Dialog>
  );
}
