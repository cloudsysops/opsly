export interface TraceContext {
  traceId: string;
  spanId: string;
  correlationId: string;
  parentSpanId?: string;
}

export interface Tracer {
  startSpan(name: string, attributes?: Record<string, any>): Span;
}

export interface Span {
  setAttribute(key: string, value: any): void;
  addEvent(name: string, attributes?: Record<string, any>): void;
  end(status?: string): void;
}

const contextStack: TraceContext[] = [];

class SimpleTracer implements Tracer {
  startSpan(name: string, attributes?: Record<string, any>): Span {
    const parent = contextStack[contextStack.length - 1];
    const ctx: TraceContext = {
      traceId: parent?.traceId || generateId(),
      spanId: generateId(),
      correlationId: parent?.correlationId || generateId(),
      parentSpanId: parent?.spanId,
    };

    contextStack.push(ctx);

    return {
      setAttribute: (key: string, value: any) => {
        // Store attribute - in production would go to OpenTelemetry
      },
      addEvent: (eventName: string, attrs?: Record<string, any>) => {
        // Record event
      },
      end: (status?: string) => {
        contextStack.pop();
      },
    };
  }
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

let globalTracer: Tracer | null = null;

export function createTracer(): Tracer {
  return new SimpleTracer();
}

export function injectContext(headers: Record<string, string>): Record<string, string> {
  const current = contextStack[contextStack.length - 1];
  if (current) {
    return {
      ...headers,
      'x-trace-id': current.traceId,
      'x-span-id': current.spanId,
      'x-correlation-id': current.correlationId,
    };
  }
  return headers;
}

export function extractContext(headers: Record<string, string>): TraceContext | null {
  const traceId = headers['x-trace-id'];
  const spanId = headers['x-span-id'];
  const correlationId = headers['x-correlation-id'];

  if (traceId && spanId) {
    return {
      traceId,
      spanId,
      correlationId: correlationId || generateId(),
    };
  }

  return null;
}
