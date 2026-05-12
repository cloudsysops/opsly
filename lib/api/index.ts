export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  requestId: string;
  timestamp: string;
}

export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export function createResponse<T>(data: T, requestId: string): APIResponse<T> {
  return {
    success: true,
    data,
    requestId,
    timestamp: new Date().toISOString(),
  };
}

export function createErrorResponse(
  code: string,
  message: string,
  requestId: string
): APIResponse<null> {
  return {
    success: false,
    error: { code, message },
    requestId,
    timestamp: new Date().toISOString(),
  };
}

export const API_VERSIONS = {
  V1: 'v1',
  V2: 'v2',
} as const;
