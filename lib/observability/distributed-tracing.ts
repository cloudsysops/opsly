import { createLogger } from './logger';
import { TraceContext } from './tracing';

export interface JobTrace extends TraceContext {
  jobId: string;
  jobType: string;
  tenantSlug: string;
  workerName: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  status: 'pending' | 'running' | 'success' | 'failed' | 'retry';
  error?: {
    message: string;
    category?: string;
    strategy?: string;
  };
  metadata: Record<string, any>;
}

export interface JobTraceMetrics {
  totalDuration: number;
  queued: number;
  processing: number;
  completed: number;
  failed: number;
  retried: number;
  averageProcessingTime: number;
  p95ProcessingTime: number;
  p99ProcessingTime: number;
  errorRate: number;
  retryRate: number;
}

const logger = createLogger('distributed-tracing');
const activeTraces = new Map<string, JobTrace>();
const completedTraces: JobTrace[] = [];
const maxHistorySize = 10000;

export class DistributedTracer {
  static startJobTrace(
    jobId: string,
    jobType: string,
    tenantSlug: string,
    workerName: string,
    metadata: Record<string, any> = {}
  ): JobTrace {
    const traceId = `trace_${jobId}`;
    const spanId = `span_${Math.random().toString(36).substring(2, 9)}`;

    const trace: JobTrace = {
      traceId,
      spanId,
      correlationId: `corr_${jobId}`,
      jobId,
      jobType,
      tenantSlug,
      workerName,
      startTime: Date.now(),
      status: 'pending',
      metadata,
    };

    activeTraces.set(jobId, trace);

    logger.info('Job trace started', {
      jobId,
      jobType,
      tenantSlug,
      traceId,
      spanId,
    });

    return trace;
  }

  static updateJobTrace(
    jobId: string,
    updates: Partial<JobTrace>
  ): void {
    const trace = activeTraces.get(jobId);
    if (trace) {
      Object.assign(trace, updates);
      if (updates.status === 'running' && !trace.metadata.runStartTime) {
        trace.metadata.runStartTime = Date.now();
      }
    }
  }

  static completeJobTrace(
    jobId: string,
    status: 'success' | 'failed',
    error?: { message: string; category?: string; strategy?: string }
  ): JobTrace | undefined {
    const trace = activeTraces.get(jobId);
    if (!trace) {
      logger.warn('Attempted to complete non-existent trace', { jobId });
      return undefined;
    }

    trace.endTime = Date.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.status = status;
    if (error) {
      trace.error = error;
    }

    activeTraces.delete(jobId);
    completedTraces.push(trace);

    // Maintain size limit
    if (completedTraces.length > maxHistorySize) {
      completedTraces.shift();
    }

    logger.info('Job trace completed', {
      jobId,
      status,
      duration: trace.duration,
      error: error?.message,
    });

    return trace;
  }

  static getActiveTrace(jobId: string): JobTrace | undefined {
    return activeTraces.get(jobId);
  }

  static getTraceHistory(limit: number = 100): JobTrace[] {
    return completedTraces.slice(-limit);
  }

  static getMetricsForWorker(workerName: string): JobTraceMetrics {
    const traces = completedTraces.filter((t) => t.workerName === workerName);

    if (traces.length === 0) {
      return {
        totalDuration: 0,
        queued: activeTraces.size,
        processing: 0,
        completed: 0,
        failed: 0,
        retried: 0,
        averageProcessingTime: 0,
        p95ProcessingTime: 0,
        p99ProcessingTime: 0,
        errorRate: 0,
        retryRate: 0,
      };
    }

    const durations = traces
      .filter((t) => t.duration !== undefined)
      .map((t) => t.duration!)
      .sort((a, b) => a - b);

    const completed = traces.filter((t) => t.status === 'success').length;
    const failed = traces.filter((t) => t.status === 'failed').length;
    const retried = traces.filter((t) => t.status === 'retry').length;

    return {
      totalDuration: traces.reduce((sum, t) => sum + (t.duration || 0), 0),
      queued: activeTraces.size,
      processing: Array.from(activeTraces.values()).filter(
        (t) => t.workerName === workerName && t.status === 'running'
      ).length,
      completed,
      failed,
      retried,
      averageProcessingTime:
        durations.reduce((sum, d) => sum + d, 0) / durations.length,
      p95ProcessingTime: durations[Math.floor(durations.length * 0.95)],
      p99ProcessingTime: durations[Math.floor(durations.length * 0.99)],
      errorRate: failed / traces.length,
      retryRate: retried / traces.length,
    };
  }

  static getSystemMetrics(): Record<string, JobTraceMetrics> {
    const workers = new Set(
      Array.from(activeTraces.values()).map((t) => t.workerName)
    );

    const metrics: Record<string, JobTraceMetrics> = {};
    for (const worker of workers) {
      metrics[worker] = this.getMetricsForWorker(worker);
    }

    return metrics;
  }

  static injectTraceHeaders(trace: JobTrace): Record<string, string> {
    return {
      'x-trace-id': trace.traceId,
      'x-span-id': trace.spanId,
      'x-correlation-id': trace.correlationId,
      'x-job-id': trace.jobId,
      'x-tenant-slug': trace.tenantSlug,
    };
  }

  static extractTraceContext(headers: Record<string, string>): Partial<JobTrace> | null {
    const traceId = headers['x-trace-id'];
    const spanId = headers['x-span-id'];

    if (traceId && spanId) {
      return {
        traceId,
        spanId,
        correlationId: headers['x-correlation-id'],
        jobId: headers['x-job-id'],
        tenantSlug: headers['x-tenant-slug'],
      };
    }

    return null;
  }

  static clearHistory(): void {
    completedTraces.length = 0;
  }

  static getActiveTracesCount(): number {
    return activeTraces.size;
  }

  static getCompletedTracesCount(): number {
    return completedTraces.length;
  }
}

export function createJobTraceLogger(jobId: string, workerName: string) {
  return {
    info: (msg: string, metadata: Record<string, any> = {}) => {
      const trace = activeTraces.get(jobId);
      if (trace) {
        logger.info(`[${workerName}] ${msg}`, {
          jobId,
          traceId: trace.traceId,
          spanId: trace.spanId,
          ...metadata,
        });
      }
    },
    error: (msg: string, error: Error, metadata: Record<string, any> = {}) => {
      const trace = activeTraces.get(jobId);
      if (trace) {
        logger.error(`[${workerName}] ${msg}`, error, {
          jobId,
          traceId: trace.traceId,
          spanId: trace.spanId,
          ...metadata,
        });
      }
    },
  };
}

export { createLogger, getLogger } from './logger';
export { TraceContext, Tracer, Span, createTracer, injectContext, extractContext } from './tracing';
