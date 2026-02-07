export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface BatchEventRequest {
  events: Array<{
    session_id: string;
    event_type: string;
    timestamp: string;
    payload: Record<string, unknown>;
  }>;
}

export interface BatchEventResponse {
  inserted: number;
  failed: number;
  errors?: string[];
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}
