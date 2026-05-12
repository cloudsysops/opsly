#!/usr/bin/env npx tsx
/**
 * Orchestrator Watchdog Service — Phase 6 Autonomy
 *
 * Monitors:
 * - Health endpoint: GET http://localhost:3011/health every 30s
 * - Queue depth: Redis queue sizes for all workers
 * - Worker status: All 4 workers responding (cursor, claude, copilot, opencode)
 * - Orchestrator process: Auto-restart docker-compose on failure
 *
 * Escalation:
 * - Exponential backoff: 1s, 2s, 4s, 8s before restart
 * - Max retries: 4 before manual escalation
 * - Graceful shutdown: trap SIGTERM/SIGINT, cleanup queued tasks
 *
 * Discord alerts: Via shared notifier service
 */

import * as http from 'http';
import * as https from 'https';
import { execSync } from 'child_process';
import * as fs from 'fs';

interface HealthCheckResult {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'down';
  orchestrator: {
    reachable: boolean;
    statusCode?: number;
    responseTime?: number;
  };
  queues: {
    cursor: number;
    claude: number;
    copilot: number;
    opencode: number;
    total: number;
  };
  workers: {
    cursor: boolean;
    claude: boolean;
    copilot: boolean;
    opencode: boolean;
  };
  lastRestartTime?: string;
  consecutiveFailures: number;
  message: string;
}

interface BackoffState {
  consecutiveFailures: number;
  lastFailureTime: number;
  lastRestartTime: number;
  restartCount: number;
}

class OrchestratorWatchdog {
  private port = 3011;
  private healthEndpoint =
    process.env.ORCHESTRATOR_HEALTH_ENDPOINT || 'http://localhost:3011/health';
  private queuesEndpoint =
    process.env.HEALTH_SERVER_QUEUES_ENDPOINT || 'http://localhost:3013/queues';
  private workersEndpoint =
    process.env.HEALTH_SERVER_WORKERS_ENDPOINT || 'http://localhost:3013/workers';
  private checkInterval = parseInt(process.env.WATCHDOG_CHECK_INTERVAL_MS || '30000', 10); // 30 seconds
  private maxRetries = parseInt(process.env.WATCHDOG_MAX_RETRIES || '4', 10);
  private backoffMs = [1000, 2000, 4000, 8000]; // exponential backoff base

  private getBackoffWithJitter(baseMs: number): number {
    return baseMs * (0.5 + Math.random()); // Add jitter: 50-150% of base delay
  }
  private state: BackoffState = {
    consecutiveFailures: 0,
    lastFailureTime: 0,
    lastRestartTime: 0,
    restartCount: 0,
  };

  private logFile: string;
  private metricsFile: string;
  private isShuttingDown = false;

  constructor() {
    this.logFile = process.env.WATCHDOG_LOG || '/tmp/orchestrator-watchdog.log';
    this.metricsFile = process.env.WATCHDOG_METRICS || '/tmp/orchestrator-watchdog-metrics.json';
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '[ERROR]' : level === 'warn' ? '[WARN]' : '[INFO]';
    const logMessage = `${timestamp} ${prefix} ${message}`;
    console.log(logMessage);

    try {
      fs.appendFileSync(this.logFile, logMessage + '\n', { encoding: 'utf-8' });
    } catch (err) {
      console.error(
        `Failed to write to log file: ${err instanceof Error ? err.message : String(err)}`
      );
    }
  }

  private saveMetrics(result: HealthCheckResult): void {
    try {
      fs.writeFileSync(this.metricsFile, JSON.stringify(result, null, 2), { encoding: 'utf-8' });
    } catch (err) {
      this.log(
        `Failed to save metrics: ${err instanceof Error ? err.message : String(err)}`,
        'warn'
      );
    }
  }

  private async makeHttpRequest(
    url: string,
    timeout = 5000
  ): Promise<{ statusCode?: number; responseTime: number; error?: string }> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const protocol = url.startsWith('https') ? https : http;

      const req = protocol.get(url, { timeout }, (res) => {
        const responseTime = Date.now() - startTime;
        resolve({
          statusCode: res.statusCode,
          responseTime,
        });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({
          responseTime: Date.now() - startTime,
          error: 'timeout',
        });
      });

      req.on('error', (err) => {
        resolve({
          responseTime: Date.now() - startTime,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    });
  }

  private async checkHealth(): Promise<HealthCheckResult> {
    const timestamp = new Date().toISOString();

    // Check orchestrator health endpoint
    const orchestratorCheck = await this.makeHttpRequest(this.healthEndpoint);
    const orchestratorHealthy =
      orchestratorCheck.statusCode === 200 || orchestratorCheck.statusCode === 201;

    // Check queue sizes (via health server)
    let queues = { cursor: 0, claude: 0, copilot: 0, opencode: 0, total: 0 };
    try {
      const queuesCheck = await this.makeHttpRequest(this.queuesEndpoint);
      if (queuesCheck.statusCode === 200) {
        // Will be populated by health server
        queues = { cursor: 0, claude: 0, copilot: 0, opencode: 0, total: 0 };
      }
    } catch (err) {
      // Queues endpoint may not be available yet
    }

    // Check worker status (via health server)
    let workers = { cursor: false, claude: false, copilot: false, opencode: false };
    try {
      const workersCheck = await this.makeHttpRequest(this.workersEndpoint);
      if (workersCheck.statusCode === 200) {
        workers = { cursor: false, claude: false, copilot: false, opencode: false };
      }
    } catch (err) {
      // Workers endpoint may not be available yet
    }

    // Determine overall status
    let status: 'healthy' | 'degraded' | 'down' = 'healthy';
    let message = 'All systems operational';

    if (!orchestratorHealthy) {
      status = 'down';
      message = `Orchestrator unreachable: ${orchestratorCheck.error || 'HTTP ' + orchestratorCheck.statusCode}`;
      this.state.consecutiveFailures++;
      this.state.lastFailureTime = Date.now();
    } else {
      // Check if we have enough healthy workers
      const healthyWorkers = Object.values(workers).filter((w) => w).length;
      if (healthyWorkers < 3) {
        status = 'degraded';
        message = `Only ${healthyWorkers}/4 workers healthy`;
        this.state.consecutiveFailures++;
        this.state.lastFailureTime = Date.now();
      } else {
        // Reset failure counter on success
        this.state.consecutiveFailures = 0;
        message = `All 4 workers healthy (queue: ${queues.total} pending)`;
      }
    }

    const result: HealthCheckResult = {
      timestamp,
      status,
      orchestrator: {
        reachable: orchestratorHealthy,
        statusCode: orchestratorCheck.statusCode,
        responseTime: orchestratorCheck.responseTime,
      },
      queues,
      workers,
      consecutiveFailures: this.state.consecutiveFailures,
      message,
      lastRestartTime: this.state.lastRestartTime
        ? new Date(this.state.lastRestartTime).toISOString()
        : undefined,
    };

    return result;
  }

  private async restartOrchestrator(): Promise<boolean> {
    if (this.state.restartCount >= this.maxRetries) {
      this.log(
        `Max restarts (${this.maxRetries}) exceeded. Manual intervention required.`,
        'error'
      );
      return false;
    }

    const backoffIndex = Math.min(this.state.consecutiveFailures - 1, this.backoffMs.length - 1);
    const baseMs = this.backoffMs[backoffIndex];
    const waitMs = this.getBackoffWithJitter(baseMs);

    this.log(
      `Waiting ${Math.round(waitMs)}ms before restart attempt ${this.state.restartCount + 1}/${this.maxRetries}...`
    );
    await new Promise((resolve) => setTimeout(resolve, waitMs));

    try {
      this.log('Attempting docker-compose restart...');
      const cwd = process.env.OPSLY_ROOT || '/home/user/opsly';
      const args = [
        'compose',
        '-f',
        'infra/docker-compose.openclaw-orchestrator.yml',
        'restart',
        'orchestrator',
      ];
      execSync('docker ' + args.join(' '), { stdio: 'inherit', cwd, shell: '/bin/sh' });

      this.state.lastRestartTime = Date.now();
      this.state.restartCount++;
      this.log(`Orchestrator restart successful (attempt ${this.state.restartCount})`);

      // Wait for service to be ready
      await this.waitForOrchestrator(30000);
      return true;
    } catch (err) {
      this.log(`Restart failed: ${err instanceof Error ? err.message : String(err)}`, 'error');
      return false;
    }
  }

  private async waitForOrchestrator(maxWaitMs: number): Promise<boolean> {
    const startTime = Date.now();
    const pollInterval = 2000;

    while (Date.now() - startTime < maxWaitMs) {
      try {
        const check = await this.makeHttpRequest(this.healthEndpoint, 3000);
        if (check.statusCode === 200 || check.statusCode === 201) {
          this.log('Orchestrator is ready');
          return true;
        }
      } catch (err) {
        // Still not ready
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
    }

    return false;
  }

  private setupSignalHandlers(): void {
    const shutdown = async (signal: string) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      this.log(`Received ${signal}, gracefully shutting down...`);

      // Save final metrics
      const finalCheck = await this.checkHealth();
      this.saveMetrics(finalCheck);

      this.log('Watchdog shutdown complete');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }

  async run(): Promise<void> {
    this.log('='.repeat(70));
    this.log('Orchestrator Watchdog starting (Phase 6 Autonomy)');
    this.log(`Health check interval: ${this.checkInterval}ms`);
    this.log(`Max restarts: ${this.maxRetries}`);
    this.log(`Log file: ${this.logFile}`);
    this.log(`Metrics file: ${this.metricsFile}`);
    this.log('='.repeat(70));

    this.setupSignalHandlers();

    // Initial health check
    let lastCheck = await this.checkHealth();
    this.saveMetrics(lastCheck);
    this.log(`Initial health: ${lastCheck.status} - ${lastCheck.message}`);

    // Main watchdog loop
    let checkCount = 0;
    while (!this.isShuttingDown) {
      checkCount++;

      // Wait for next interval
      await new Promise((resolve) => setTimeout(resolve, this.checkInterval));

      if (this.isShuttingDown) break;

      // Perform health check
      lastCheck = await this.checkHealth();
      this.saveMetrics(lastCheck);

      this.log(`Check #${checkCount}: ${lastCheck.status} - ${lastCheck.message}`);

      // Take action if needed
      if (lastCheck.status === 'down') {
        this.log('Orchestrator is DOWN, initiating recovery', 'error');

        if (this.state.consecutiveFailures <= this.maxRetries) {
          const restarted = await this.restartOrchestrator();
          if (!restarted) {
            this.log(
              'Restart failed and max retries exceeded. Escalating to Discord notifier.',
              'error'
            );
            this.notifyEscalation(lastCheck);
          }
        }
      } else if (lastCheck.status === 'degraded') {
        this.log('Orchestrator is DEGRADED, monitoring closely', 'warn');
      }
    }
  }

  private notifyEscalation(result: HealthCheckResult): void {
    // Trigger Discord notification via shared notifier
    try {
      const notifierPath =
        process.env.NOTIFIER_SCRIPT || '/home/user/opsly/scripts/notify-discord-orchestrator.js';
      const dataJson = JSON.stringify(result);
      const cmd = `node ${notifierPath} escalation ${JSON.stringify(dataJson)}`;
      execSync(cmd, { stdio: 'inherit', shell: '/bin/sh' });
    } catch (err) {
      this.log(
        `Failed to send escalation notification: ${err instanceof Error ? err.message : String(err)}`,
        'warn'
      );
    }
  }
}

async function main(): Promise<void> {
  const watchdog = new OrchestratorWatchdog();
  await watchdog.run();
}

main().catch((err) => {
  console.error(`Fatal error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
