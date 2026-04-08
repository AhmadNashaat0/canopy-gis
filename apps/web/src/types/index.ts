export interface GetMultipleResponse<TData> {
  items: TData[];
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface GetMultipleRequest {
  PageNumber?: number;
  pageSize?: number;
  sorting?: { sortBy: string };
  filters?: Record<string, unknown>;
}
