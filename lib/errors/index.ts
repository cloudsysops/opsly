export class AppError extends Error {
  constructor(
    public code: string,
    public statusCode: number,
    message: string,
    public context?: Record<string, any>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super('VALIDATION_ERROR', 400, message, context);
  }
}

export class AuthError extends AppError {
  constructor(message: string, context?: Record<string, any>) {
    super('AUTH_ERROR', 401, message, context);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, context?: Record<string, any>) {
    super('NOT_FOUND', 404, `${resource} not found`, context);
  }
}

export class RateLimitError extends AppError {
  constructor(retryAfter: number, context?: Record<string, any>) {
    super('RATE_LIMIT', 429, `Rate limited. Retry after ${retryAfter}s`, { retryAfter, ...context });
  }
}

export function handleError(error: unknown) {
  if (error instanceof AppError) {
    return { code: error.code, statusCode: error.statusCode, message: error.message, context: error.context };
  }
  return { code: 'INTERNAL_ERROR', statusCode: 500, message: 'Internal server error' };
}
