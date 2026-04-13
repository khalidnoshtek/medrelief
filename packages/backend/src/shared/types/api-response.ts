export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiErrorResponse {
  error_code: string;
  message: string;
  details?: Record<string, unknown>;
  correlation_id: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
}
