import type { PaginationState, Table } from "@tanstack/table-core";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Button } from "@gis-app/ui/components/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@gis-app/ui/components/select";

export function DataTablePagination<TData>({
  table,
  pagination,
}: {
  table: Table<TData>;
  pagination: PaginationState;
}) {
  return (
    <div className="flex items-center justify-between space-x-4 md:space-x-6 lg:space-x-8">
      <div className="flex items-center space-x-2">
        <Select
          onValueChange={(value) => {
            table.setPageSize(Number(value));
          }}
          value={`${pagination.pageSize}`}
        >
          <SelectTrigger size="sm">
            <SelectValue className="bg-transparent" placeholder={pagination.pageSize} />
          </SelectTrigger>
          <SelectContent side="top">
            {[10, 30, 50, 100].map((pageSize) => (
              <SelectItem key={pageSize} value={`${pageSize}`}>
                {pageSize}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center px-3 font-medium text-sm">
          {pagination.pageIndex + 1} / {table.getPageCount()}
        </div>
        <Button
          className="hidden h-8 w-8 p-0 lg:flex"
          disabled={!table.getCanPreviousPage()}
          onClick={() => {
            table.setPageIndex(0);
          }}
          variant="outline"
        >
          <span className="sr-only">Go to first page</span>
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button
          className="h-8 w-8 p-0"
          disabled={!table.getCanPreviousPage()}
          onClick={() => {
            table.previousPage();
          }}
          variant="outline"
        >
          <span className="sr-only">Go to previous page</span>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          className="h-8 w-8 p-0"
          disabled={!table.getCanNextPage()}
          onClick={() => {
            table.nextPage();
          }}
          variant="outline"
        >
          <span className="sr-only">Go to next page</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          className="hidden h-8 w-8 p-0 lg:flex"
          disabled={!table.getCanNextPage()}
          onClick={() => {
            table.setPageIndex(table.getPageCount() - 1);
          }}
          variant="outline"
        >
          <span className="sr-only">Go to last page</span>
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
