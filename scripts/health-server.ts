#!/usr/bin/env npx tsx
/**
 * Orchestrator Health Server — Phase 6 Autonomy
 *
 * Express server on port 3013 providing:
 * - GET /health → orchestrator status (quick check)
 * - GET /queues → BullMQ queue sizes (cursor, claude, copilot, opencode)
 * - GET /workers → worker states and health
 * - GET /metrics → aggregated system metrics
 *
 * Used by:
 * - Watchdog service for auto-restart logic
 * - Mission Control dashboard for UI display
 * - Prometheus for metrics collection
 *
 * Integration:
 * - Polls orchestrator /health endpoint
 * - Queries Redis for queue depths
 * - Aggregates worker pool status
 */

import * as http from 'http';
import * as https from 'https';
import * as Redis from 'redis';

const PORT = parseInt(process.env.HEALTH_SERVER_PORT || '3013', 10);
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:3011';
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

interface QueueStats {
  cursor: number;
  claude: number;
  copilot: number;
  opencode: number;
  total: number;
}

interface WorkerStatus {
  cursor: { healthy: boolean; lastSeen?: string };
  claude: { healthy: boolean; lastSeen?: string };
  copilot: { healthy: boolean; lastSeen?: string };
  opencode: { healthy: boolean; lastSeen?: string };
  totalWorkers: number;
  healthyWorkers: number;
}

interface SystemMetrics {
  timestamp: string;
  uptime: number;
  memory: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
  orchestrator: {
    reachable: boolean;
    responseTime?: number;
    statusCode?: number;
  };
  queues: QueueStats;
  workers: WorkerStatus;
}

let redisClient: Redis.RedisClientType | null = null;
let redisConnected = false;

async function initRedis(): Promise<void> {
  if (redisConnected) return;

  try {
    redisClient = Redis.createClient({
      url: REDIS_URL,
      socket: {
        connectTimeout: 5000,
        reconnectStrategy: (retries) => Math.min(retries * 50, 500),
      },
    });

    redisClient.on('error', (err) => {
      log(`Redis error: ${err instanceof Error ? err.message : String(err)}`, 'warn');
      redisConnected = false;
    });

    redisClient.on('connect', () => {
      log('Redis connected');
      redisConnected = true;
    });

    await redisClient.connect();
    redisConnected = true;
    log('Redis client initialized');
  } catch (err) {
    log(`Failed to initialize Redis: ${err instanceof Error ? err.message : String(err)}`, 'error');
    redisConnected = false;
  }
}

function log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
  const timestamp = new Date().toISOString();
  const prefix = level === 'error' ? '[ERROR]' : level === 'warn' ? '[WARN]' : '[INFO]';
  console.log(`${timestamp} ${prefix} ${message}`);
}

async function checkOrchestratorHealth(): Promise<{
  reachable: boolean;
  statusCode?: number;
  responseTime?: number;
}> {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const url = new URL(ORCHESTRATOR_URL + '/health');
    const protocol = url.protocol === 'https:' ? https : http;

    const req = protocol.get(
      {
        hostname: url.hostname,
        port: url.port || (url.protocol === 'https:' ? 443 : 80),
        path: url.pathname + url.search,
        timeout: 3000,
      },
      (res) => {
        const responseTime = Date.now() - startTime;
        resolve({
          reachable: res.statusCode === 200 || res.statusCode === 201,
          statusCode: res.statusCode,
          responseTime,
        });
      }
    );

    req.on('timeout', () => {
      req.destroy();
      resolve({
        reachable: false,
        responseTime: Date.now() - startTime,
      });
    });

    req.on('error', () => {
      resolve({
        reachable: false,
        responseTime: Date.now() - startTime,
      });
    });
  });
}

async function getQueueStats(): Promise<QueueStats> {
  const stats: QueueStats = {
    cursor: 0,
    claude: 0,
    copilot: 0,
    opencode: 0,
    total: 0,
  };

  if (!redisConnected || !redisClient) {
    return stats;
  }

  try {
    // BullMQ queue naming convention: bull:{queueName}
    const queues = ['cursor', 'claude', 'copilot', 'opencode'];

    for (const queueName of queues) {
      const key = `bull:${queueName}:wait`;
      const count = await redisClient.lLen(key);
      stats[queueName as keyof typeof stats] = count || 0;
      stats.total += count || 0;
    }

    return stats;
  } catch (err) {
    log(`Failed to get queue stats: ${err instanceof Error ? err.message : String(err)}`, 'warn');
    return stats;
  }
}

async function getWorkerStatus(): Promise<WorkerStatus> {
  const workers: WorkerStatus = {
    cursor: { healthy: false },
    claude: { healthy: false },
    copilot: { healthy: false },
    opencode: { healthy: false },
    totalWorkers: 4,
    healthyWorkers: 0,
  };

  if (!redisConnected || !redisClient) {
    return workers;
  }

  try {
    // Check worker presence via Redis keys
    const workerNames = ['cursor', 'claude', 'copilot', 'opencode'];

    for (const name of workerNames) {
      // Worker keys: bull:{queueName}:{workerId}
      const pattern = `bull:${name}:*`;
      const keys = await redisClient.keys(pattern);

      const healthy = keys.length > 0;
      workers[name as keyof Omit<WorkerStatus, 'totalWorkers' | 'healthyWorkers'>] = {
        healthy,
        lastSeen: new Date().toISOString(),
      };

      if (healthy) {
        workers.healthyWorkers++;
      }
    }

    return workers;
  } catch (err) {
    log(`Failed to get worker status: ${err instanceof Error ? err.message : String(err)}`, 'warn');
    return workers;
  }
}

async function getSystemMetrics(): Promise<SystemMetrics> {
  const [orchestratorHealth, queues, workers] = await Promise.all([
    checkOrchestratorHealth(),
    getQueueStats(),
    getWorkerStatus(),
  ]);

  return {
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024), // MB
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024), // MB
      external: Math.round(process.memoryUsage().external / 1024 / 1024), // MB
    },
    orchestrator: orchestratorHealth,
    queues,
    workers,
  };
}

function createHealthServer(): http.Server {
  const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405);
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    try {
      if (req.url === '/health') {
        // Quick health check - only orchestrator status
        const orchestrator = await checkOrchestratorHealth();
        res.writeHead(orchestrator.reachable ? 200 : 503);
        res.end(JSON.stringify({
          status: orchestrator.reachable ? 'healthy' : 'down',
          orchestrator,
          timestamp: new Date().toISOString(),
        }));
      } else if (req.url === '/queues') {
        // Queue depth report
        const queues = await getQueueStats();
        res.writeHead(200);
        res.end(JSON.stringify({
          status: 'ok',
          queues,
          timestamp: new Date().toISOString(),
        }));
      } else if (req.url === '/workers') {
        // Worker pool status
        const workers = await getWorkerStatus();
        res.writeHead(200);
        res.end(JSON.stringify({
          status: 'ok',
          workers,
          timestamp: new Date().toISOString(),
        }));
      } else if (req.url === '/metrics') {
        // Aggregated metrics
        const metrics = await getSystemMetrics();
        res.writeHead(200);
        res.end(JSON.stringify(metrics, null, 2));
      } else if (req.url === '/ready') {
        // Readiness probe (same as health for now)
        const orchestrator = await checkOrchestratorHealth();
        res.writeHead(orchestrator.reachable ? 200 : 503);
        res.end(JSON.stringify({
          ready: orchestrator.reachable,
          timestamp: new Date().toISOString(),
        }));
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({
          error: 'Not found',
          available: ['/health', '/queues', '/workers', '/metrics', '/ready'],
        }));
      }
    } catch (err) {
      log(`Request handler error: ${err instanceof Error ? err.message : String(err)}`, 'error');
      res.writeHead(500);
      res.end(JSON.stringify({
        error: 'Internal server error',
        message: err instanceof Error ? err.message : String(err),
      }));
    }
  });

  return server;
}

async function main(): Promise<void> {
  log('='.repeat(70));
  log('Health Server starting (Phase 6 Autonomy)');
  log(`Port: ${PORT}`);
  log(`Orchestrator URL: ${ORCHESTRATOR_URL}`);
  log(`Redis URL: ${REDIS_URL}`);
  log('='.repeat(70));

  // Initialize Redis connection
  await initRedis();

  // Create and start server
  const server = createHealthServer();

  server.listen(PORT, '0.0.0.0', () => {
    log(`Health Server listening on port ${PORT}`);
    log('Endpoints:');
    log('  GET /health   - Orchestrator health status');
    log('  GET /queues   - Queue size statistics');
    log('  GET /workers  - Worker pool status');
    log('  GET /metrics  - Aggregated system metrics');
    log('  GET /ready    - Readiness probe');
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    log(`Received ${signal}, shutting down gracefully...`);

    server.close(() => {
      log('HTTP server closed');
    });

    if (redisClient && redisConnected) {
      try {
        await redisClient.quit();
        log('Redis connection closed');
      } catch (err) {
        log(`Error closing Redis: ${err instanceof Error ? err.message : String(err)}`, 'warn');
      }
    }

    setTimeout(() => {
      log('Shutdown timeout, forcing exit');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  log(`Fatal error: ${err instanceof Error ? err.message : String(err)}`, 'error');
  process.exit(1);
});
