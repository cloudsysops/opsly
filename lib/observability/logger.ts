export interface LogContext {
  userId?: string;
  tenantId?: string;
  correlationId?: string;
  requestId?: string;
  [key: string]: any;
}

export interface Logger {
  info(msg: string, context?: LogContext): void;
  warn(msg: string, context?: LogContext): void;
  error(msg: string, error?: Error, context?: LogContext): void;
  debug(msg: string, context?: LogContext): void;
}

const loggers = new Map<string, Logger>();

class SimpleLogger implements Logger {
  constructor(private name: string) {}

  info(msg: string, context?: LogContext): void {
    console.log(`[${this.name}] INFO:`, msg, context);
  }

  warn(msg: string, context?: LogContext): void {
    console.warn(`[${this.name}] WARN:`, msg, context);
  }

  error(msg: string, error?: Error, context?: LogContext): void {
    console.error(`[${this.name}] ERROR:`, msg, error?.message, context);
  }

  debug(msg: string, context?: LogContext): void {
    if (process.env.DEBUG) {
      console.debug(`[${this.name}] DEBUG:`, msg, context);
    }
  }
}

export function createLogger(name: string): Logger {
  const logger = new SimpleLogger(name);
  loggers.set(name, logger);
  return logger;
}

export function getLogger(name: string): Logger {
  return loggers.get(name) || createLogger(name);
}
