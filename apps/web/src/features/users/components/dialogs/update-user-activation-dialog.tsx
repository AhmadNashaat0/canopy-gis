import { CheckCircle, XCircle } from "lucide-react";
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
import { updateUserActivation } from "../../actions/update-user-activation";

export function UpdateUserActivationDialog({
  id,
  children,
  toActive,
  tooltipContent,
}: {
  id: string;
  children: React.ReactElement;
  toActive: boolean;
  tooltipContent?: string;
}) {
  const [open, setOpen] = useState(false);
  const updateUserActivationMutate = updateUserActivation.useMutation({
    id,
    onSuccess: () => setOpen(false),
  });
  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <Tooltip>
        <TooltipTrigger render={<DialogTrigger render={children} />} />
        {tooltipContent && <TooltipContent>{tooltipContent}</TooltipContent>}
      </Tooltip>
      <DialogContent>
        <DialogHeader className="flex items-center justify-center gap-3 pb-2">
          {toActive ? (
            <div className="flex size-9 items-center justify-center rounded-full bg-green-100 dark:bg-green-700">
              <CheckCircle className="size-5 text-green-600 dark:text-green-200" />
            </div>
          ) : (
            <div className="flex size-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-500">
              <XCircle className="size-5 text-red-600 dark:text-red-200" />
            </div>
          )}
          <div className="space-y-1 text-center">
            <DialogTitle>Update User Activation</DialogTitle>
            <DialogDescription>
              {toActive
                ? "Are you sure you want to activate this user?"
                : "Are you sure you want to deactivate this user?"}
            </DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={
              <Button
                className="capitalize"
                disabled={updateUserActivationMutate.isPending}
                type="button"
                variant="outline"
              >
                Cancel
              </Button>
            }
          />
          <Button
            className="capitalize"
            disabled={updateUserActivationMutate.isPending}
            onClick={() =>
              updateUserActivationMutate.mutate({
                status: toActive ? "active" : "inactive",
              })
            }
          >
            {toActive ? "Activate" : "Inactivate"}
            {updateUserActivationMutate.isPending && <Spinner className="h-4 w-4" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
