export interface OpslyLogger {
  info(message: string, context?: Readonly<Record<string, unknown>>): void;
  error(message: string, context?: Readonly<Record<string, unknown>>): void;
}

export class ConsoleOpslyLogger implements OpslyLogger {
  constructor(private readonly namespace: string) {}

  info(message: string, context?: Readonly<Record<string, unknown>>): void {
    console.info(`[${this.namespace}] ${message}`, context ?? {});
  }

  error(message: string, context?: Readonly<Record<string, unknown>>): void {
    console.error(`[${this.namespace}] ${message}`, context ?? {});
  }
}

export function createConsoleLogger(namespace: string): OpslyLogger {
  return new ConsoleOpslyLogger(namespace);
}
