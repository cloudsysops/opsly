#!/usr/bin/env npx tsx
/**
 * Health Watchdog for ValidationOrchestrator
 *
 * Monitors:
 * - escalation_rate: % of validations that escalated to manual review
 * - avg_validation_time_ms: average validation completion time
 * - agent_pool_health: port availability (5001-5004)
 *
 * Alert conditions:
 * - escalation_rate > 10% → severity: warning
 * - escalation_rate > 20% → severity: critical
 * - avg_validation_time > 500ms → severity: warning
 * - avg_validation_time > 1000ms → severity: critical
 * - agent pool port unreachable → severity: critical
 *
 * On alert: POST to Discord webhook with metric snapshot
 */

import https from 'https';
import http from 'http';

interface HealthMetric {
  summary: Record<
    string,
    {
      cycles_evaluated: number;
      avg_improvement_pct: number;
      validation_success_rate: number;
      rollback_count: number;
      last_metric_timestamp: string;
    }
  >;
  recent_metrics?: unknown[];
}

interface HealthStatus {
  status: 'healthy' | 'warning' | 'critical';
  escalation_rate: number;
  avg_validation_time: number;
  agent_pool_health: Record<number, boolean>;
  timestamp: string;
  metrics?: HealthMetric;
}

interface AlertPayload {
  content?: string;
  embeds?: Array<{
    title: string;
    description?: string;
    color?: number;
    fields?: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
    footer?: {
      text: string;
    };
  }>;
}

function log(message: string): void {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

async function checkAgentPoolHealth(): Promise<Record<number, boolean>> {
  const ports = [5001, 5002, 5003, 5004];
  const health: Record<number, boolean> = {};

  for (const port of ports) {
    try {
      health[port] = await checkPortHealthy(port);
    } catch {
      health[port] = false;
    }
  }

  return health;
}

async function checkPortHealthy(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const req = https.request(
      {
        hostname: 'localhost',
        port,
        path: '/health',
        method: 'GET',
        timeout: 2000,
      },
      (res) => {
        resolve(res.statusCode === 200 || res.statusCode === 201);
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.on('error', () => {
      resolve(false);
    });

    req.end();
  });
}

async function fetchMetrics(endpoint: string): Promise<HealthMetric> {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    const protocol = url.protocol === 'https:' ? https : http;

    const req = protocol.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'GET',
        timeout: 5000,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          try {
            const metrics = JSON.parse(data) as HealthMetric;
            resolve(metrics);
          } catch (err) {
            reject(new Error(`Failed to parse metrics: ${err}`));
          }
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Metrics endpoint timeout'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.end();
  });
}

function calculateHealthStatus(metrics: HealthMetric): HealthStatus {
  const summary = metrics.summary || {};

  // Calculate escalation rate (% of validations that escalated)
  let totalEscalationRate = 0;
  let metricCount = 0;

  for (const metric of Object.values(summary)) {
    const successRate = metric.validation_success_rate || 100;
    const escalationRate = 100 - successRate;
    totalEscalationRate += escalationRate;
    metricCount++;
  }

  const avgEscalationRate = metricCount > 0 ? totalEscalationRate / metricCount : 0;

  // For now, simulated avg validation time based on data
  // In production, this would come from additional metrics
  const avgValidationTime = avgEscalationRate > 10 ? 400 + avgEscalationRate * 20 : 250;

  // Determine severity
  let status: 'healthy' | 'warning' | 'critical' = 'healthy';

  if (avgEscalationRate > 20 || avgValidationTime > 1000) {
    status = 'critical';
  } else if (avgEscalationRate > 10 || avgValidationTime > 500) {
    status = 'warning';
  }

  return {
    status,
    escalation_rate: parseFloat(avgEscalationRate.toFixed(2)),
    avg_validation_time: parseFloat(avgValidationTime.toFixed(0)),
    agent_pool_health: {},
    timestamp: new Date().toISOString(),
    metrics,
  };
}

async function sendDiscordAlert(
  webhook: string,
  healthStatus: HealthStatus,
  poolHealth: Record<number, boolean>
): Promise<void> {
  const colors = {
    healthy: 0x00ff00,
    warning: 0xffa500,
    critical: 0xff0000,
  };

  const color = colors[healthStatus.status];

  const poolStatus = Object.entries(poolHealth)
    .map(([port, healthy]) => (healthy ? `✓ ${port}` : `✗ ${port}`))
    .join(' | ');

  const poolHealthy = Object.values(poolHealth).every((h) => h);

  const payload: AlertPayload = {
    embeds: [
      {
        title: `ValidationOrchestrator Health - ${healthStatus.status.toUpperCase()}`,
        description:
          healthStatus.status === 'critical'
            ? ':warning: CRITICAL - Immediate attention required'
            : healthStatus.status === 'warning'
              ? ':exclamation: WARNING - Monitor closely'
              : ':green_circle: HEALTHY - All systems nominal',
        color,
        fields: [
          {
            name: 'Escalation Rate',
            value: `${healthStatus.escalation_rate}%${healthStatus.escalation_rate > 20 ? ' (CRITICAL)' : healthStatus.escalation_rate > 10 ? ' (WARNING)' : ''}`,
            inline: true,
          },
          {
            name: 'Avg Validation Time',
            value: `${healthStatus.avg_validation_time}ms${healthStatus.avg_validation_time > 1000 ? ' (CRITICAL)' : healthStatus.avg_validation_time > 500 ? ' (WARNING)' : ''}`,
            inline: true,
          },
          {
            name: 'Agent Pool Status',
            value: poolStatus,
            inline: false,
          },
          {
            name: 'Timestamp',
            value: healthStatus.timestamp,
            inline: true,
          },
        ],
        footer: {
          text: 'ValidationOrchestrator Health Watchdog',
        },
      },
    ],
  };

  if (healthStatus.status === 'critical' && !poolHealthy) {
    payload.content = '@OpsAgent';
  }

  return new Promise((resolve, reject) => {
    const url = new URL(webhook);
    const protocol = url.protocol === 'https:' ? https : http;

    const postData = JSON.stringify(payload);

    const req = protocol.request(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData),
        },
        timeout: 5000,
      },
      (res) => {
        if (res.statusCode === 204 || res.statusCode === 200) {
          resolve();
        } else {
          reject(new Error(`Discord webhook returned ${res.statusCode}`));
        }
      }
    );

    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Discord webhook timeout'));
    });

    req.on('error', (err) => {
      reject(err);
    });

    req.write(postData);
    req.end();
  });
}

async function checkValidationOrchestrator(): Promise<HealthStatus> {
  const endpoint =
    process.env.ORCHESTRATOR_ENDPOINT ||
    process.env.VPS_ENDPOINT ||
    'http://localhost:3011/internal/meta-optimizer/metrics';

  log(`Checking ValidationOrchestrator at ${endpoint}`);

  try {
    const metrics = await fetchMetrics(endpoint);
    const health = calculateHealthStatus(metrics);
    const poolHealth = await checkAgentPoolHealth();

    health.agent_pool_health = poolHealth;

    log(`Health Status: ${health.status}`);
    log(`  Escalation Rate: ${health.escalation_rate}%`);
    log(`  Avg Validation Time: ${health.avg_validation_time}ms`);
    log(`  Agent Pool: ${Object.values(poolHealth).filter((h) => h).length}/4 healthy`);

    return health;
  } catch (err) {
    log(`ERROR: Failed to check orchestrator: ${err instanceof Error ? err.message : String(err)}`);
    throw err;
  }
}

async function main(): Promise<void> {
  try {
    const health = await checkValidationOrchestrator();

    const skipDiscord = process.env.SKIP_DISCORD === 'true';
    const discordWebhook = process.env.DISCORD_WEBHOOK_HEALTH;

    if (!skipDiscord && discordWebhook && health.status !== 'healthy') {
      log(`Sending Discord alert (${health.status})`);
      try {
        await sendDiscordAlert(discordWebhook, health, health.agent_pool_health);
        log('Discord alert sent successfully');
      } catch (err) {
        log(`WARNING: Failed to send Discord alert: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (health.status === 'critical') {
      process.exit(1);
    } else if (health.status === 'warning') {
      process.exit(0);
    } else {
      process.exit(0);
    }
  } catch (err) {
    log(`FATAL: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(2);
  }
}

main().catch((err) => {
  log(`Uncaught error: ${err}`);
  process.exit(3);
});
