import type { Column } from "@tanstack/react-table";
import { ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@gis-app/ui/components/button";
import { cn } from "@gis-app/ui/lib/utils";

type ButtonProps = React.ComponentProps<typeof Button>;

interface DataTableColumnHeaderProps<TData, TValue> extends ButtonProps {
  column: Column<TData, TValue>;
  title: string;
}

export function DataTableColumnHeader<TData, TValue>({
  column,
  title,
  className,
  ...props
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) {
    return <div className={cn(className)}>{title}</div>;
  }

  return (
    <div className={cn("flex", className)}>
      <Button
        className={cn(
          "hustify-center flex h-7 items-center gap-3 px-1 hover:cursor-pointer hover:bg-transparent!",
        )}
        onClick={() => {
          column.toggleSorting(undefined);
        }}
        size="sm"
        variant="ghost"
        {...props}
      >
        <span>{title}</span>
        <span className="flex h-full items-center">
          <ChevronUp
            className={cn(
              "size-3",
              column.getIsSorted() === "asc" ? "text-muted-foreground" : "hidden",
            )}
          />
          <ChevronDown
            className={cn(
              "size-3",
              column.getIsSorted() === "desc" ? "text-muted-foreground" : "hidden",
            )}
          />
        </span>
      </Button>
    </div>
  );
}
