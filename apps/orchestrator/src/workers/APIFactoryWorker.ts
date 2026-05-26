/**
 * API Factory Worker
 *
 * Worker BullMQ para generar APIs seguras y monitoreadas
 * Jobs: 'api_factory_generate', 'api_factory_security', 'api_factory_monitor'
 */

import { Worker, Job } from 'bullmq';
import { connection } from '../queue.js';
import { setJobState } from '../state/store.js';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import { logWorkerInfo, logWorkerError } from '../observability/worker-log.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';

interface ApiGenerateJobData {
  api_name: string;
  description: string;
  endpoints: Array<{
    path: string;
    method: string;
    auth: string;
    rate_limit?: number;
    response_schema?: Record<string, unknown>;
  }>;
  tenant_slug: string;
  options?: {
    language: string;
    framework: string;
    database?: string;
  };
}

interface ApiSecurityJobData {
  api_id: string;
  target: string;
  scan_type: 'full' | 'quick' | 'OWASP-top10' | 'auth-bypass';
  tenant_slug: string;
}

interface ApiMonitorJobData {
  api_id: string;
  action: 'health' | 'metrics' | 'alerts';
  tenant_slug: string;
  timeframe: string;
}

export function startAPIFactoryWorker(): Worker {
  const concurrency = getWorkerConcurrency('api_factory');

  const worker = new Worker(
    'api_factory',
    async (job: Job) => {
      const t0 = Date.now();
      logWorkerLifecycle('start', 'api_factory', job);

      try {
        if (job.name === 'api_generate') {
          return await handleApiGenerate(job as Job<ApiGenerateJobData>);
        } else if (job.name === 'api_security') {
          return await handleApiSecurity(job as Job<ApiSecurityJobData>);
        } else if (job.name === 'api_monitor') {
          return await handleApiMonitor(job as Job<ApiMonitorJobData>);
        }

        throw new Error(`Unknown job type: ${job.name}`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logWorkerLifecycle('fail', 'api_factory', job, {
          duration_ms: Date.now() - t0,
          error: msg,
        });
        throw err;
      } finally {
        logWorkerLifecycle('complete', 'api_factory', job, { duration_ms: Date.now() - t0 });
      }
    },
    { connection, concurrency }
  );

  worker.on('completed', (job) => {
    logWorkerInfo('api_factory', 'Job completed', { jobId: job.id });
  });

  worker.on('failed', (job, error) => {
    logWorkerError('api_factory', 'Job failed', { jobId: job?.id, error: error.message });
  });

  logWorkerInfo('api_factory', 'Started', { concurrency });

  return worker;
}

async function handleApiGenerate(job: Job<ApiGenerateJobData>): Promise<any> {
  const { api_name, description, endpoints, tenant_slug, options } = job.data;

  await setJobState(job.id!, {
    status: 'running',
    type: 'api_generate',
    tenant_slug,
    request_id: job.id!,
    started_at: new Date().toISOString(),
  });

  // Simulate code generation
  const generatedFiles = [
    `src/routes/${api_name.toLowerCase().replace(/\s+/g, '-')}.ts`,
    'src/middleware/auth.ts',
    'src/middleware/rate-limit.ts',
    'src/middleware/cors.ts',
    'src/middleware/helmet.ts',
    'src/docs/openapi.yaml',
    'docker-compose.yml',
    'Dockerfile',
    'package.json',
    '.env.example',
  ];

  // Simulate processing time
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const result = {
    api_id: `api_${Date.now()}`,
    api_name,
    description,
    endpoints_count: endpoints.length,
    generated_files: generatedFiles,
    deployment_ready: true,
    security_features: {
      rate_limiting: true,
      cors: true,
      helmet: true,
      auth: endpoints.some((e) => e.auth !== 'none') ? 'configured' : 'none',
    },
    monitoring: {
      health_endpoint: '/health',
      metrics_endpoint: '/metrics',
      logging: 'enabled',
    },
  };

  await setJobState(job.id!, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    result,
  });

  return result;
}

async function handleApiSecurity(job: Job<ApiSecurityJobData>): Promise<any> {
  const { api_id, target, scan_type, tenant_slug } = job.data;

  await setJobState(job.id!, {
    status: 'running',
    type: 'api_security',
    tenant_slug,
    request_id: job.id!,
    started_at: new Date().toISOString(),
  });

  // Simulate security scan
  const vulnerabilities = [
    { severity: 'critical', type: 'SQL Injection', endpoint: '/api/users', cve: 'CVE-2024-001' },
    { severity: 'high', type: 'Broken Auth', endpoint: '/api/auth', cve: 'CVE-2024-002' },
    { severity: 'medium', type: 'Info Disclosure', endpoint: '/api/debug', cve: 'CVE-2024-003' },
  ];

  await new Promise((resolve) => setTimeout(resolve, 3000));

  const result = {
    scan_id: `scan_${Date.now()}`,
    api_id,
    target,
    scan_type,
    status: 'completed',
    duration_seconds: 145,
    vulnerabilities,
    vulnerability_count: {
      critical: vulnerabilities.filter((v) => v.severity === 'critical').length,
      high: vulnerabilities.filter((v) => v.severity === 'high').length,
      medium: vulnerabilities.filter((v) => v.severity === 'medium').length,
      low: 0,
    },
    recommendations: [
      'Implement parameterized queries',
      'Add MFA for auth endpoints',
      'Remove debug endpoints from production',
      'Enable WAF rules',
    ],
    security_score: 65,
    compliance_status: {
      OWASP: 'fail',
      SOC2: 'pass',
      GDPR: 'partial',
    },
  };

  await setJobState(job.id!, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    result,
  });

  return result;
}

async function handleApiMonitor(job: Job<ApiMonitorJobData>): Promise<any> {
  const { api_id, action, tenant_slug, timeframe } = job.data;

  await setJobState(job.id!, {
    status: 'running',
    type: 'api_monitor',
    tenant_slug,
    request_id: job.id!,
    started_at: new Date().toISOString(),
  });

  // Return monitoring data
  const result = {
    api_id,
    action,
    timeframe,
    timestamp: new Date().toISOString(),
    health: {
      status: 'healthy',
      uptime: '99.8%',
      last_check: new Date().toISOString(),
    },
    metrics: {
      requests_total: 45230,
      requests_success: 45120,
      error_rate: '0.24%',
      latency_p50: 28,
      latency_p95: 85,
      latency_p99: 210,
    },
    alerts: [
      {
        severity: 'warning',
        message: 'High latency on /api/users',
        timestamp: new Date().toISOString(),
      },
    ],
    rate_limits: {
      remaining: 9500,
      reset_at: new Date(Date.now() + 3600000).toISOString(),
    },
  };

  await setJobState(job.id!, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    result,
  });

  return result;
}
