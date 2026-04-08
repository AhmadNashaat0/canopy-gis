import type { Column } from "@tanstack/react-table";
import { Check, PlusCircle, XCircle } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { Badge } from "@gis-app/ui/components/badge";
import { Button } from "@gis-app/ui/components/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@gis-app/ui/components/command";
import { Popover, PopoverContent, PopoverTrigger } from "@gis-app/ui/components/popover";
import { Separator } from "@gis-app/ui/components/separator";
import { Spinner } from "@gis-app/ui/components/spinner";
import { cn } from "@gis-app/ui/lib/utils";

export interface Option {
  label: string;
  value: string | number | boolean;
  count?: number;
  icon?: React.FC<React.SVGProps<SVGSVGElement>>;
}

interface DataTableFacetedFilterProps<TData, TValue> {
  column?: Column<TData, TValue>;
  title?: string;
  options?: Option[];
  multiple?: boolean;
  isLoading?: boolean;
}

export function DataTableSelect<TData, TValue>({
  column,
  title,
  options,
  multiple = false,
  isLoading,
}: DataTableFacetedFilterProps<TData, TValue>) {
  const [open, setOpen] = useState(false);

  const columnFilterValue = column?.getFilterValue();
  const selectedValues = useMemo(() => {
    let values: unknown[] = [];

    if (Array.isArray(columnFilterValue)) {
      values = columnFilterValue;
    } else if (columnFilterValue !== undefined) {
      values = [columnFilterValue];
    }

    return new Set(values);
  }, [columnFilterValue]);

  const onItemSelect = useCallback(
    (option: Option, isSelected: boolean) => {
      if (!column) {
        return;
      }
      if (multiple) {
        const newSelectedValues = new Set(selectedValues);
        if (isSelected) {
          newSelectedValues.delete(option.value);
        } else {
          newSelectedValues.add(option.value);
        }
        const filterValues = Array.from(newSelectedValues);
        column.setFilterValue(filterValues.length ? filterValues : undefined);
      } else {
        column.setFilterValue(isSelected ? undefined : option.value);
        setOpen(false);
      }
    },
    [column, multiple, selectedValues],
  );

  const onReset = useCallback(
    (event?: React.MouseEvent) => {
      event?.stopPropagation();
      column?.setFilterValue(undefined);
    },
    [column],
  );

  return (
    <Popover onOpenChange={setOpen} open={open}>
      <PopoverTrigger
        render={
          <Button className="border-dashed font-normal" size="sm" variant="outline">
            {selectedValues?.size > 0 ? (
              // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/useSemanticElements: false
              <div
                aria-label={`Clear ${title} filter`}
                className="rounded-sm opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                onClick={onReset}
                role="button"
                tabIndex={0}
              >
                <XCircle />
              </div>
            ) : // biome-ignore lint/style/noNestedTernary: false
            isLoading ? (
              <Spinner className="size-4" />
            ) : (
              <PlusCircle />
            )}
            {title}
            {selectedValues?.size > 0 && (
              <>
                <Separator
                  className="mx-0.5 data-[orientation=vertical]:h-4"
                  orientation="vertical"
                />
                <Badge className="rounded-sm px-1 font-normal lg:hidden" variant="secondary">
                  {selectedValues.size}
                </Badge>
                <div className="hidden items-center gap-1 lg:flex">
                  {selectedValues.size > 2 ? (
                    <Badge className="rounded-sm px-1 font-normal" variant="secondary">
                      {selectedValues.size} selected
                    </Badge>
                  ) : (
                    options
                      ?.filter((option) => selectedValues.has(option.value))
                      .map((option) => (
                        <Badge
                          className="rounded-sm px-1 font-normal"
                          key={option.label}
                          variant="secondary"
                        >
                          {option.label}
                        </Badge>
                      ))
                  )}
                </div>
              </>
            )}
          </Button>
        }
      />
      <PopoverContent align="start" className="w-50 p-0">
        <Command>
          <CommandInput placeholder={title} />
          <CommandList className="max-h-full">
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup className="max-h-[300px] scroll-py-1 overflow-y-auto overflow-x-hidden">
              {options?.map((option) => {
                const isSelected = selectedValues.has(option.value);

                return (
                  <CommandItem key={option.label} onSelect={() => onItemSelect(option, isSelected)}>
                    <div
                      className={cn(
                        "flex size-4 items-center justify-center rounded-sm border border-primary",
                        isSelected ? "bg-primary" : "opacity-50 [&_svg]:invisible",
                      )}
                    >
                      <Check />
                    </div>
                    {option.icon && <option.icon />}
                    <span className="truncate capitalize">{option.label}</span>
                    {option.count && (
                      <span className="ml-auto font-mono text-xs">{option.count}</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            {selectedValues.size > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem className="justify-center text-center" onSelect={() => onReset()}>
                    Clear filters
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
