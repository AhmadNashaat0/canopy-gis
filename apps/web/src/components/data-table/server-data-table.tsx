import type { UseQueryResult } from "@tanstack/react-query";
import { flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import type {
  ColumnDef,
  ColumnFiltersState,
  PaginationState,
  SortingState,
  Table as TTable,
} from "@tanstack/table-core";
import type { TRPCClientErrorLike } from "@trpc/client";
import type { DefaultErrorShape } from "@trpc/server/unstable-core-do-not-import";
import { Activity, type ReactNode, useEffect, useMemo, useState } from "react";
import type { GetMultipleRequest } from "@/types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@gis-app/ui/components/table";
import { Skeleton } from "@gis-app/ui/components/skeleton";
import { Checkbox } from "@gis-app/ui/components/checkbox";
import { DataTablePagination } from "./data-pagination";

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  getDataFn: (props: GetMultipleRequest) => UseQueryResult<
    { items: TData[]; count: number },
    TRPCClientErrorLike<{
      transformer: false;
      errorShape: DefaultErrorShape;
    }>
  >;
  setDataCount?: (data: { count: number; isLoading: boolean }) => void;
  selectedDataState?: {
    data: TData[];
    setData: React.Dispatch<React.SetStateAction<TData[]>>;
  };
  children?: (table: TTable<TData>) => ReactNode;
  unVisibleColumnIds?: string[];
  defaultFilters?: Record<keyof TData, string | number | boolean>;
  // biome-ignore lint/suspicious/noExplicitAny: ggg
  trans?: any;
}

export function ServerDataTable<TData extends { id: string }, TValue>({
  columns,
  getDataFn,
  setDataCount,
  selectedDataState,
  children,
  unVisibleColumnIds,
  defaultFilters,
}: DataTableProps<TData, TValue>) {
  const selectedRows = useMemo(
    () =>
      selectedDataState?.data?.reduce(
        (acc, curr) => {
          acc[curr.id] = curr;
          return acc;
        },
        {} as Record<string, TData>,
      ) ?? {},
    [selectedDataState?.data],
  );
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>(
    defaultFilters
      ? Object.keys(defaultFilters)?.map((k) => ({
          id: k,
          value: defaultFilters[k as keyof TData],
        }))
      : [],
  );
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });

  const { data, isLoading } = getDataFn({
    PageNumber: pagination.pageIndex + 1,
    pageSize: pagination.pageSize,
    sorting: sorting[0]?.id
      ? {
          sortBy: (sorting[0]?.desc ? "-" : "") + sorting[0]?.id,
        }
      : undefined,
    filters: columnFilters.reduce(
      (acc, curr) => {
        acc[curr.id] = curr.value;
        return acc;
      },
      {} as Record<string, unknown>,
    ),
  });

  // biome-ignore lint/correctness/useExhaustiveDependencies: false
  useEffect(() => {
    setDataCount?.({ count: data?.count ?? 0, isLoading });
  }, [data?.count, isLoading]);

  const table = useReactTable({
    data: data?.items ?? [],
    columns,
    state: {
      sorting,
      pagination,
      columnFilters,
      columnVisibility: unVisibleColumnIds?.reduce(
        (acc, curr) => {
          acc[curr] = false;
          return acc;
        },
        {} as Record<string, boolean>,
      ),
    },
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    rowCount: data?.count,
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
  });

  return (
    <div className="flex w-full flex-col gap-4">
      <Activity mode={children ? "visible" : "hidden"}>
        <div className="w-full">{children?.(table)}</div>
      </Activity>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow className="" key={headerGroup.id}>
                {selectedDataState && <TableHead />}
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, rowIndex) => (
                // biome-ignore lint/suspicious/noArrayIndexKey: false
                <TableRow key={`skeleton-row-${rowIndex}`}>
                  {Array.from({
                    length: table.getVisibleFlatColumns().length,
                  }).map((_, cellIndex) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: false
                    <TableCell key={`skeleton-cell-${rowIndex}-${cellIndex}`}>
                      <Skeleton className="h-6" />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            {!isLoading && table.getRowModel().rows?.length
              ? table.getRowModel().rows.map((row) => (
                  <TableRow data-state={selectedRows[row.id] ? "selected" : ""} key={row.id}>
                    {selectedDataState && (
                      <TableCell>
                        <Checkbox
                          aria-label="Select row"
                          checked={Boolean(selectedRows[row.original.id])}
                          onCheckedChange={(value) => {
                            if (!selectedDataState) {
                              return;
                            }

                            if (value) {
                              selectedDataState.setData((old) => [...old, row.original]);
                            } else {
                              selectedDataState.setData((old) =>
                                old.filter((item) => item.id !== row.original.id),
                              );
                            }
                          }}
                        />
                      </TableCell>
                    )}
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              : !isLoading && (
                  <TableRow>
                    <TableCell className="h-24 text-center" colSpan={columns.length}>
                      No results.
                    </TableCell>
                  </TableRow>
                )}
          </TableBody>
        </Table>
        <div className="border-t px-2 py-2">
          <DataTablePagination
            pagination={{
              pageIndex: pagination.pageIndex,
              pageSize: pagination.pageSize,
            }}
            table={table}
          />
        </div>
      </div>
    </div>
  );
}
