import { Hono } from 'hono';
import { DistributedTracer } from '@intcloudsysops/observability';
import { getStatsCollector } from '../metrics/worker-stats';

const app = new Hono();

interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  orchestrator: {
    uptime: number;
    activeJobs: number;
    processedJobs: number;
  };
  workers: Array<{
    name: string;
    totalJobs: number;
    successfulJobs: number;
    failedJobs: number;
    errorRate: number;
    retryRate: number;
    averageDuration: number;
    p95Duration: number;
    p99Duration: number;
  }>;
  system: {
    timestamp: string;
    averageErrorRate: number;
    averageRetryRate: number;
  };
}

const startTime = Date.now();

// Health check endpoint
app.get('/', async (c) => {
  try {
    const statsCollector = getStatsCollector();
    const health = await statsCollector.getHealthMetrics();

    const response: HealthResponse = {
      status: health.systemMetrics.averageErrorRate > 0.1 ? 'degraded' : 'healthy',
      timestamp: new Date().toISOString(),
      orchestrator: {
        uptime: Date.now() - startTime,
        activeJobs: health.totalActiveJobs,
        processedJobs: health.systemMetrics.totalTracedJobs,
      },
      workers: health.workerStats.map((ws) => ({
        name: ws.workerName,
        totalJobs: ws.totalJobs,
        successfulJobs: ws.successfulJobs,
        failedJobs: ws.failedJobs,
        errorRate: ws.errorRate,
        retryRate: ws.retryRate,
        averageDuration: Math.round(ws.averageDuration),
        p95Duration: ws.p95Duration,
        p99Duration: ws.p99Duration,
      })),
      system: {
        timestamp: health.systemMetrics.timestamp.toISOString(),
        averageErrorRate: health.systemMetrics.averageErrorRate,
        averageRetryRate: health.systemMetrics.averageRetryRate,
      },
    };

    return c.json(response);
  } catch (error) {
    return c.json(
      {
        status: 'unhealthy',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      500
    );
  }
});

// Detailed traces endpoint (for debugging)
app.get('/traces', async (c) => {
  const limit = c.query('limit') ? parseInt(c.query('limit') || '100', 10) : 100;
  const traces = DistributedTracer.getTraceHistory(limit);

  return c.json({
    count: traces.length,
    traces: traces.map((t) => ({
      jobId: t.jobId,
      traceId: t.traceId,
      status: t.status,
      duration: t.duration,
      error: t.error?.message,
      timestamp: new Date(t.startTime).toISOString(),
    })),
  });
});

// Metrics endpoint (for Prometheus-style scraping)
app.get('/metrics', async (c) => {
  const statsCollector = getStatsCollector();
  const health = await statsCollector.getHealthMetrics();

  let metricsText = '';

  // Gauge: Active jobs
  metricsText += `# HELP orchestrator_active_jobs Number of active jobs\n`;
  metricsText += `# TYPE orchestrator_active_jobs gauge\n`;
  metricsText += `orchestrator_active_jobs ${health.totalActiveJobs}\n\n`;

  // Gauge: Processed jobs
  metricsText += `# HELP orchestrator_processed_jobs Total processed jobs\n`;
  metricsText += `# TYPE orchestrator_processed_jobs gauge\n`;
  metricsText += `orchestrator_processed_jobs ${health.systemMetrics.totalTracedJobs}\n\n`;

  // Per-worker metrics
  for (const ws of health.workerStats) {
    const workerLabel = `worker="${ws.workerName}"`;

    metricsText += `# HELP worker_total_jobs Total jobs for worker\n`;
    metricsText += `# TYPE worker_total_jobs gauge\n`;
    metricsText += `worker_total_jobs{${workerLabel}} ${ws.totalJobs}\n`;

    metricsText += `# HELP worker_error_rate Error rate for worker\n`;
    metricsText += `# TYPE worker_error_rate gauge\n`;
    metricsText += `worker_error_rate{${workerLabel}} ${ws.errorRate.toFixed(4)}\n`;

    metricsText += `# HELP worker_retry_rate Retry rate for worker\n`;
    metricsText += `# TYPE worker_retry_rate gauge\n`;
    metricsText += `worker_retry_rate{${workerLabel}} ${ws.retryRate.toFixed(4)}\n`;

    metricsText += `# HELP worker_average_duration Average job duration\n`;
    metricsText += `# TYPE worker_average_duration gauge\n`;
    metricsText += `worker_average_duration{${workerLabel}} ${ws.averageDuration}\n`;

    metricsText += `# HELP worker_p95_duration 95th percentile job duration\n`;
    metricsText += `# TYPE worker_p95_duration gauge\n`;
    metricsText += `worker_p95_duration{${workerLabel}} ${ws.p95Duration}\n`;

    metricsText += `# HELP worker_p99_duration 99th percentile job duration\n`;
    metricsText += `# TYPE worker_p99_duration gauge\n`;
    metricsText += `worker_p99_duration{${workerLabel}} ${ws.p99Duration}\n\n`;
  }

  return c.text(metricsText, {
    headers: {
      'Content-Type': 'text/plain; version=0.0.4',
    },
  });
});

export default app;
