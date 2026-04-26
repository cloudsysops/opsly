'use strict';

/**
 * Health HTTP + worker BullMQ `hermes-orchestration` sin el resto de workers OpenClaw.
 */
const { setupLangSmithTracing } = require('../../apps/orchestrator/dist/agents/langsmith.js');
const {
  closeCircuitBreakerRedis,
} = require('../../apps/orchestrator/dist/resilience/circuit-breaker.js');
const {
  drainMeteringOperations,
} = require('../../apps/orchestrator/dist/metering/usage-events-meter.js');
const { closeOrchestratorRedis } = require('../../apps/orchestrator/dist/metering/redis-client.js');
const { connection, hermesOrchestrationQueue } = require('../../apps/orchestrator/dist/queue.js');
const { startOrchestratorHealthServer } = require('../../apps/orchestrator/dist/health-server.js');
const {
  startHermesOrchestrationWorker,
} = require('../../apps/orchestrator/dist/workers/HermesOrchestrationWorker.js');

function closeHttpServer(server) {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

setupLangSmithTracing();
process.stdout.write(
  JSON.stringify({
    service: 'hermes-standalone',
    http: 'starting',
    port: Number.parseInt(process.env.ORCHESTRATOR_HEALTH_PORT ?? '3020', 10),
  }) + '\n'
);

const healthServer = startOrchestratorHealthServer();
const hermesWorker = startHermesOrchestrationWorker(connection);

let shuttingDown = false;
async function shutdown(signal) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;
  console.log(`[hermes-standalone] Shutdown (${signal})`);
  try {
    await hermesWorker.close();
  } catch (e) {
    console.error('[hermes-standalone] worker.close', e);
  }
  try {
    await drainMeteringOperations();
  } catch (e) {
    console.error('[hermes-standalone] drainMeteringOperations', e);
  }
  try {
    await closeHttpServer(healthServer);
  } catch (e) {
    console.error('[hermes-standalone] healthServer.close', e);
  }
  try {
    await hermesOrchestrationQueue.close();
  } catch (e) {
    console.error('[hermes-standalone] hermesOrchestrationQueue.close', e);
  }
  try {
    await closeOrchestratorRedis();
  } catch (e) {
    console.error('[hermes-standalone] closeOrchestratorRedis', e);
  }
  try {
    await closeCircuitBreakerRedis();
  } catch (e) {
    console.error('[hermes-standalone] closeCircuitBreakerRedis', e);
  }
  process.exit(0);
}

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.on('SIGINT', () => {
  void shutdown('SIGINT');
});
