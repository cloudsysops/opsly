/**
 * Correlation ID Tracking for Distributed Systems
 */

import { randomUUID } from 'crypto';

export class CorrelationContext {
  private static contextKey = 'correlation_id';
  private static correlationId: string = randomUUID();

  static initialize(correlationId?: string): void {
    this.correlationId = correlationId || randomUUID();
  }

  static getId(): string {
    return this.correlationId;
  }

  static generate(): string {
    this.correlationId = randomUUID();
    return this.correlationId;
  }
}

/**
 * Middleware to extract or generate correlation ID
 */
export function extractCorrelationId(req: { headers: { get: (key: string) => string | null } }): string {
  const headerValue = req.headers.get('x-correlation-id') || req.headers.get('x-request-id');
  const correlationId = headerValue || randomUUID();
  CorrelationContext.initialize(correlationId);
  return correlationId;
}

/**
 * Structured logging with correlation ID
 */
export interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  correlationId: string;
  service: string;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export function createLogEntry(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  service: string,
  data?: Record<string, unknown>,
  error?: Error
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    correlationId: CorrelationContext.getId(),
    service,
    message,
    data,
    error: error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined,
  };
}

export function logInfo(message: string, service: string, data?: Record<string, unknown>): void {
  const entry = createLogEntry('info', message, service, data);
  console.log(JSON.stringify(entry));
}

export function logError(
  message: string,
  service: string,
  error: Error,
  data?: Record<string, unknown>
): void {
  const entry = createLogEntry('error', message, service, data, error);
  console.error(JSON.stringify(entry));
}
