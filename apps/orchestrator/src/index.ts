import { setupLangSmithTracing } from './agents/langsmith.js';
import { processIntent } from './engine.js';
import { subscribeEvents } from './events/bus.js';
import { startOrchestratorHealthServer } from './health-server.js';
import { drainMeteringOperations } from './metering/usage-events-meter.js';
import { closeOrchestratorRedis } from './metering/redis-client.js';
import {
  orchestratorModeLabel,
  parseOrchestratorRole,
  shouldRunControlPlane,
  shouldRunWorkers,
} from './orchestrator-role.js';
import {
  agentClassifierQueue,
  connection,
  hermesOrchestrationQueue,
  orchestratorQueue,
} from './queue.js';
import { closeCircuitBreakerRedis } from './resilience/circuit-breaker.js';
import { closeJobStateStore } from './state/store.js';
import { TeamManager } from './teams/TeamManager.js';
import { AutonomousScheduler } from './schedulers/autonomous-scheduler.js';
import { CursorCopilotBridge } from './lib/cursor-copilot-bridge.js';
import { startBackupWorker } from './workers/BackupWorker.js';
import { startCursorWorker } from './workers/CursorWorker.js';
import { startDriveWorker } from './workers/DriveWorker.js';
import { startHealthWorker } from './workers/HealthWorker.js';
import { startN8nWorker } from './workers/N8nWorker.js';
import { startNotifyWorker } from './workers/NotifyWorker.js';
import { startAgentClassifierWorker } from './workers/AgentClassifierWorker.js';
import { startOllamaWorker } from './workers/OllamaWorker.js';
import { startSuspensionWorker } from './workers/SuspensionWorker.js';
import { startGeneralEventsWorker } from './workers/GeneralEventsWorker.js';
import { startIntentDispatchWorker } from './workers/IntentDispatchWorker.js';
import { startJcodeWorker } from './workers/JcodeWorker.js';
import { closeWebhookQueue, createWebhookWorker } from './workers/WebhookWorker.js';
import { startWebhooksProcessingWorker } from './workers/WebhooksProcessingWorker.js';
import { startHiveWorker } from './workers/HiveWorker.js';

type AsyncCleanup = () => Promise<void>;

async function runEventSubscription(teamManager: TeamManager): Promise<AsyncCleanup> {
  const subscription = await subscribeEvents(async (event, eventData) => {
    console.log(`[orchestrator] Evento: ${event}`, eventData);

    switch (event) {
      case 'tenant.onboarded': {
        try {
          const jobId = await teamManager.assignToTeam('deploy', eventData);
          console.log('[orchestrator] tenant.onboarded → team deploy job', jobId);
        } catch (err) {
          console.error('[orchestrator] assignToTeam(deploy) failed', err);
        }
        break;
      }
      case 'job.completed': {
        console.log(`[orchestrator] Job completado: ${String(eventData.job_id ?? '')}`);
        break;
      }
      default: {
        break;
      }
    }
  });
  return async () => subscription.close();
}

function startAllWorkers(): AsyncCleanup[] {
  const cleanup: AsyncCleanup[] = [];
  const cursorWorker = startCursorWorker(connection);
  const n8nWorker = startN8nWorker(connection);
  const notifyWorker = startNotifyWorker(connection);
  const driveWorker = startDriveWorker(connection);
  const backupWorker = startBackupWorker(connection);
  const healthWorker = startHealthWorker(connection);
  const suspensionWorker = startSuspensionWorker(connection);
  const webhookWorker = createWebhookWorker();
  const webhooksProcessingWorker = startWebhooksProcessingWorker();
  const generalEventsWorker = startGeneralEventsWorker();
  const ollamaWorker = startOllamaWorker(connection);
  const intentDispatchWorker = startIntentDispatchWorker(connection);
  const jcodeWorker = startJcodeWorker(connection);
  const hiveWorker = startHiveWorker(connection);

  let agentClassifierCleanup: AsyncCleanup[] = [];
  if (process.env.OPSLY_AGENT_CLASSIFIER_WORKER_ENABLED === 'true') {
    const { worker: agentClassifierWorker, closeRedis } = startAgentClassifierWorker(connection);
    agentClassifierCleanup = [async () => agentClassifierWorker.close(), closeRedis];
  }

  cleanup.push(
    async () => cursorWorker.close(),
    async () => n8nWorker.close(),
    async () => notifyWorker.close(),
    async () => driveWorker.close(),
    async () => backupWorker.close(),
    async () => healthWorker.stop(),
    async () => suspensionWorker.close(),
    async () => webhookWorker.close(),
    async () => webhooksProcessingWorker.close(),
    async () => generalEventsWorker.close(),
    async () => ollamaWorker.close(),
    async () => intentDispatchWorker.close(),
    async () => jcodeWorker.close(),
    async () => hiveWorker.close(),
    ...agentClassifierCleanup
  );

  console.log(
    '[orchestrator] Workers: cursor, n8n, notify, drive, backup, health, budget, opsly-webhooks, webhooks-processing, general-events, ollama, intent_dispatch, jcode, hive' +
      (process.env.OPSLY_AGENT_CLASSIFIER_WORKER_ENABLED === 'true' ? ', agent-classifier' : '') +
      '; Hermes tick → servicio opsly-hermes (no este proceso).'
  );
  return cleanup;
}

async function closeHttpServer(
  server: ReturnType<typeof startOrchestratorHealthServer>
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

async function main(): Promise<void> {
  setupLangSmithTracing();
  const role = parseOrchestratorRole();
  console.log(`[orchestrator] Iniciando… role=${role} mode=${orchestratorModeLabel(role)}`);

  let teamManager: TeamManager | undefined;
  let autonomousScheduler: AutonomousScheduler | undefined;
  let cursorCopilotBridge: CursorCopilotBridge | undefined;
  const cleanupTasks: AsyncCleanup[] = [];

  if (shouldRunControlPlane(role)) {
    teamManager = new TeamManager(connection);
    console.log('[orchestrator] TeamManager: 4 equipos BullMQ activos');
    cleanupTasks.push(async () => teamManager?.close());
  }

  const healthServer = startOrchestratorHealthServer();
  cleanupTasks.push(async () => closeHttpServer(healthServer));
  cleanupTasks.push(async () => drainMeteringOperations());
  cleanupTasks.push(async () => orchestratorQueue.close());
  cleanupTasks.push(async () => agentClassifierQueue.close());
  cleanupTasks.push(async () => hermesOrchestrationQueue.close());
  cleanupTasks.push(async () => closeWebhookQueue());
  cleanupTasks.push(async () => closeJobStateStore());
  cleanupTasks.push(async () => closeOrchestratorRedis());
  cleanupTasks.push(async () => closeCircuitBreakerRedis());

  if (shouldRunControlPlane(role) && teamManager) {
    try {
      cleanupTasks.push(await runEventSubscription(teamManager));
    } catch (err) {
      console.error('[orchestrator] runEventSubscription', err);
    }
  }

  if (shouldRunControlPlane(role) && process.env.OPSLY_AUTONOMOUS_SCHEDULER_ENABLED === 'true') {
    autonomousScheduler = new AutonomousScheduler();
    autonomousScheduler.start();
    cleanupTasks.push(async () => autonomousScheduler?.stop());
  }

  if (shouldRunControlPlane(role) && process.env.OPSLY_HELP_BRIDGE_ENABLED === 'true') {
    cursorCopilotBridge = new CursorCopilotBridge();
    await cursorCopilotBridge.start();
    cleanupTasks.push(async () => cursorCopilotBridge?.stop());
  }

  if (shouldRunWorkers(role)) {
    cleanupTasks.push(...startAllWorkers());
  }

  let shutdownStarted = false;
  const shutdown = (signal: string): void => {
    if (shutdownStarted) {
      return;
    }
    shutdownStarted = true;
    void (async () => {
      console.log(`[orchestrator] Shutdown (${signal})`);
      const results = await Promise.allSettled(cleanupTasks.map(async (cleanup) => cleanup()));
      for (const result of results) {
        if (result.status === 'rejected') {
          console.error('[orchestrator] cleanup failed', result.reason);
        }
      }
      process.exit(0);
    })().catch((err) => {
      console.error('[orchestrator] shutdown failed', err);
      process.exit(1);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  if (shouldRunControlPlane(role)) {
    const result = await processIntent({
      intent: 'notify',
      context: { title: 'OpenClaw', message: 'orchestrator started', type: 'info' },
      initiated_by: 'system',
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  }
}

void main();
