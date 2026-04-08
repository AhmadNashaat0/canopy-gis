import type { UseMutationResult } from "@tanstack/react-query";
import { Trash } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";
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

export function DeleteDialog({
  tooltipContent,
  deleteMutate,
  title,
  description,
  children,
  onOpenChange,
  open,
  id,
}: {
  title: string;
  children: React.ReactElement;
  deleteMutate: UseMutationResult<any, unknown, any, unknown>;
  tooltipContent?: string;
  description?: string;
  onOpenChange?: Dispatch<SetStateAction<boolean>>;
  open?: boolean;
  id?: string;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <Tooltip>
        <TooltipTrigger render={<DialogTrigger render={children} />} />
        {tooltipContent && <TooltipContent>{tooltipContent}</TooltipContent>}
      </Tooltip>
      <DialogContent className="w-full max-w-sm!">
        <DialogHeader className="flex items-center justify-center gap-3 pb-2">
          <div className="flex size-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-800">
            <Trash className="size-5 text-red-600 dark:text-red-300" />
          </div>
          <div className="space-y-1 text-center">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
        </DialogHeader>
        <DialogFooter>
          <DialogClose
            render={
              <Button
                className="capitalize"
                disabled={deleteMutate.isPending}
                type="button"
                variant="outline"
              >
                Confirm
              </Button>
            }
          />
          <Button
            className="capitalize"
            disabled={deleteMutate.isPending}
            onClick={() => (id ? deleteMutate.mutate({ id }) : deleteMutate.mutate({}))}
          >
            <Trash /> Delete
            {deleteMutate.isPending && <Spinner className="h-4 w-4" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
