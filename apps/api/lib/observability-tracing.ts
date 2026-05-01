/**
 * Observability: Jaeger Distributed Tracing para OpenClaw
 *
 * TODO (Sprint 8): Complete OpenTelemetry integration when dependencies are installed.
 * Current stub provides interface for tracing without requiring OpenTelemetry packages.
 *
 * Future implementation will use:
 * - @opentelemetry/sdk-trace-node
 * - @opentelemetry/exporter-trace-jaeger
 * - @opentelemetry/auto-instrumentations-node
 */

// ============================================================================
// TYPES
// ============================================================================

export interface TenantContext {
  tenant_slug: string;
  plan?: string;
  user_id?: string;
}

export interface Span {
  setAttributes(attrs: Record<string, unknown>): void;
  setStatus(status: { code: string }): void;
  recordException(err: Error): void;
  addEvent(message: string, attrs?: Record<string, unknown>): void;
  end(): void;
}

// ============================================================================
// STUB TRACER
// ============================================================================

let isInitialized = false;

export function initJaegerTracing(serviceName: string = 'openclaw'): void {
  if (isInitialized) {
    // eslint-disable-next-line no-console
    console.debug('[observability] Jaeger tracing already initialized (stub)');
    return;
  }

  // eslint-disable-next-line no-console
  console.info('[observability] Jaeger tracing initialized (stub)', {
    serviceName,
    jaegerHost: process.env.JAEGER_HOST || 'localhost',
    jaegerPort: process.env.JAEGER_PORT || '6831',
  });

  isInitialized = true;
}

// Stub span implementation
class StubSpan implements Span {
  private attributes: Record<string, unknown> = {};

  setAttributes(attrs: Record<string, unknown>): void {
    this.attributes = { ...this.attributes, ...attrs };
  }

  setStatus(): void {
    // Stub: no-op
  }

  recordException(): void {
    // Stub: no-op
  }

  addEvent(): void {
    // Stub: no-op
  }

  end(): void {
    // Stub: no-op
  }
}

// ============================================================================
// TRACER HELPERS
// ============================================================================

export async function withTenantSpan<T>(
  _name: string,
  _tenantContext: TenantContext,
  fn: (span: Span) => Promise<T>
): Promise<T> {
  const span = new StubSpan();
  return fn(span);
}

export function createJobSpan(
  _jobId: string,
  _jobType: string,
  _tenantSlug: string
): {
  span: Span;
  endSpan: (status: 'success' | 'failure' | 'timeout', durationMs: number) => void;
} {
  const span = new StubSpan();
  return {
    span,
    endSpan: (): void => {
      // Stub: no-op
    },
  };
}

export function createSkillSpan(
  _skillName: string,
  _tenantSlug: string
): {
  span: Span;
  endSpan: (status: 'success' | 'failure' | 'timeout', durationMs: number) => void;
} {
  const span = new StubSpan();
  return {
    span,
    endSpan: (): void => {
      // Stub: no-op
    },
  };
}

export function createKnowledgePipelineSpan(
  _stage: 'orchestrator' | 'notebooklm' | 'obsidian' | 'graphyfi',
  _jobId: string,
  _tenantSlug: string
): Span {
  return new StubSpan();
}

export function createProvisioningSpan(_tenantSlug: string): {
  span: Span;
  endSpan: (status: 'success' | 'failure', durationMs: number) => void;
} {
  const span = new StubSpan();
  return {
    span,
    endSpan: (): void => {
      // Stub: no-op
    },
  };
}

export function addSpanEvent(): void {
  // Stub: no-op
}

export function recordSpanException(): void {
  // Stub: no-op
}

export async function shutdownJaegerTracing(): Promise<void> {
  // eslint-disable-next-line no-console
  console.info('[observability] Jaeger tracing shutdown (stub)');
}

export function jaegerTenantMiddleware(): (
  _req: Record<string, unknown>,
  _res: Record<string, unknown>,
  next: (error?: Error) => void
) => void {
  return (
    _req: Record<string, unknown>,
    _res: Record<string, unknown>,
    next: (error?: Error) => void
  ) => {
    next();
  };
}

export const jaegerQueryUrl = (tenantSlug: string, service: string = 'openclaw'): string => {
  const jaegerHost = process.env.JAEGER_QUERY_HOST || 'localhost';
  const jaegerPort = process.env.JAEGER_QUERY_PORT || '16686';
  const baseUrl = `http://${jaegerHost}:${jaegerPort}`;
  return `${baseUrl}/search?service=${service}&tags=${encodeURIComponent('{"tenant.slug":"' + tenantSlug + '"}')}`;
};
