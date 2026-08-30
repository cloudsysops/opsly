/**
 * Metrics collection for lead funnel visibility.
 * Collects: lead volume, latency, error rates, component health.
 */

import { getServiceClient } from '../supabase';

export type MetricType = 'counter' | 'histogram' | 'gauge';

export interface MetricEvent {
  name: string;
  type: MetricType;
  value: number;
  component: string;
  tenantSlug?: string;
  tags?: Record<string, string>;
}

/**
 * In-memory metric buffer (flushes every 30 seconds)
 * In production, would write to time-series DB (DataDog, Prometheus, etc.)
 */
let metricBuffer: MetricEvent[] = [];
let flushTimer: ReturnType<typeof setInterval> | null = null;

const FLUSH_INTERVAL_MS = 30 * 1000; // 30 seconds
const MAX_BUFFER_SIZE = 1000;

async function flushMetrics(): Promise<void> {
  if (metricBuffer.length === 0) return;

  const toFlush = [...metricBuffer];
  metricBuffer = [];

  try {
    const db = getServiceClient();
    const rows = toFlush.map((metric) => ({
      metric_name: metric.name,
      metric_type: metric.type,
      metric_value: metric.value,
      component: metric.component,
      tenant_slug: metric.tenantSlug ?? 'system',
      tags: metric.tags ? JSON.stringify(metric.tags) : null,
      timestamp: new Date().toISOString(),
    }));

    const { error } = await db.schema('platform').from('metrics_log').insert(rows);

    if (error) {
      console.error('[metrics] flush failed:', error.message);
      // Re-buffer metrics that failed to flush (up to max size)
      metricBuffer = [...toFlush.slice(0, MAX_BUFFER_SIZE - metricBuffer.length), ...metricBuffer];
    }
  } catch (err) {
    console.error('[metrics] flush error:', err);
    metricBuffer = [...toFlush.slice(0, MAX_BUFFER_SIZE - metricBuffer.length), ...metricBuffer];
  }
}

export function startMetricsCollector(): void {
  if (flushTimer) return; // Already running

  flushTimer = setInterval(() => {
    void flushMetrics();
  }, FLUSH_INTERVAL_MS);

  console.info('[metrics] collector started, flush interval: ' + FLUSH_INTERVAL_MS + 'ms');
}

export function stopMetricsCollector(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

export async function recordMetric(event: MetricEvent): Promise<void> {
  metricBuffer.push(event);

  // Force flush if buffer getting too large
  if (metricBuffer.length >= MAX_BUFFER_SIZE) {
    await flushMetrics();
  }
}

/**
 * Lead funnel metrics
 */

export async function recordLeadReceived(tenantSlug: string, source: string): Promise<void> {
  return recordMetric({
    name: 'leads.received',
    type: 'counter',
    value: 1,
    component: 'webhook-receiver',
    tenantSlug,
    tags: { source },
  });
}

export async function recordLeadPersisted(tenantSlug: string, created: boolean): Promise<void> {
  return recordMetric({
    name: created ? 'leads.created' : 'leads.updated',
    type: 'counter',
    value: 1,
    component: 'supabase',
    tenantSlug,
  });
}

export async function recordLeadPersistLatency(
  tenantSlug: string,
  latencyMs: number
): Promise<void> {
  return recordMetric({
    name: 'lead.persist.latency_ms',
    type: 'histogram',
    value: latencyMs,
    component: 'supabase',
    tenantSlug,
  });
}

export async function recordN8nDispatchLatency(
  tenantSlug: string,
  latencyMs: number
): Promise<void> {
  return recordMetric({
    name: 'n8n.dispatch.latency_ms',
    type: 'histogram',
    value: latencyMs,
    component: 'n8n',
    tenantSlug,
  });
}

/**
 * Error metrics
 */

export async function recordSubabaseError(tenantSlug: string, operation: string): Promise<void> {
  return recordMetric({
    name: 'supabase.errors',
    type: 'counter',
    value: 1,
    component: 'supabase',
    tenantSlug,
    tags: { operation },
  });
}

export async function recordN8nDispatchFailure(tenantSlug: string, reason: string): Promise<void> {
  return recordMetric({
    name: 'n8n.dispatch.failures',
    type: 'counter',
    value: 1,
    component: 'n8n',
    tenantSlug,
    tags: { reason },
  });
}

export async function recordWebhookValidationError(tenantSlug: string): Promise<void> {
  return recordMetric({
    name: 'webhook.validation.errors',
    type: 'counter',
    value: 1,
    component: 'webhook-receiver',
    tenantSlug,
  });
}

/**
 * Helper: measure operation latency
 */
export function createLatencyTimer(): {
  end: (tenantSlug: string, operation: string) => Promise<number>;
} {
  const startMs = Date.now();

  return {
    async end(tenantSlug: string, operation: string): Promise<number> {
      const latencyMs = Date.now() - startMs;
      await recordMetric({
        name: `${operation}.latency_ms`,
        type: 'histogram',
        value: latencyMs,
        component: operation.split('.')[0],
        tenantSlug,
      });
      return latencyMs;
    },
  };
}
