/**
 * Centralized logger for structured logging
 * Replaces console.* calls with structured JSON output
 */

export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private formatLogEntry(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown> | Error,
  ): LogEntry {
    const timestamp = new Date().toISOString();

    if (context instanceof Error) {
      return {
        timestamp,
        level,
        message,
        error: {
          name: context.name,
          message: context.message,
          stack: context.stack,
        },
      };
    }

    return {
      timestamp,
      level,
      message,
      context,
    };
  }

  private log(entry: LogEntry): void {
    // In production, this could be sent to:
    // - Sentry
    // - DataDog
    // - CloudWatch
    // - File system
    // For now, console output with structured JSON
    console.log(JSON.stringify(entry));
  }

  debug(message: string, context?: Record<string, unknown>): void {
    this.log(this.formatLogEntry(LogLevel.DEBUG, message, context));
  }

  info(message: string, context?: Record<string, unknown>): void {
    this.log(this.formatLogEntry(LogLevel.INFO, message, context));
  }

  warn(message: string, context?: Record<string, unknown>): void {
    this.log(this.formatLogEntry(LogLevel.WARN, message, context));
  }

  error(message: string, context?: Record<string, unknown> | Error): void {
    this.log(this.formatLogEntry(LogLevel.ERROR, message, context));
  }
}

export const logger = new Logger();
