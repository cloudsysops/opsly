import { setupLangSmithTracing } from './agents/langsmith.js';
import { processIntent } from './engine.js';
import { subscribeEvents } from './events/bus.js';
import { startOrchestratorHealthServer } from './health-server.js';
import { startRuntimeGovernorSweeper } from './lib/runtime-governor-sweeper.js';
import { drainMeteringOperations } from './metering/usage-events-meter.js';
import { closeOrchestratorRedis } from './metering/redis-client.js';
import {
  orchestratorModeLabel,
  parseOrchestratorRole,
  shouldRunControlPlane,
  shouldRunWorkers,
} from './orchestrator-role.js';
import { isWorkerAllowed, parseWorkerAllowlist } from './worker-allowlist.js';
import {
  agentClassifierQueue,
  connection,
  hermesOrchestrationQueue,
  orchestratorQueue,
} from './queue.js';
import { closeCircuitBreakerRedis } from './resilience/circuit-breaker.js';
import { closeJobStateStore } from './state/store.js';
import { OpslyCortex } from './cortex.js';
import { TeamManager } from './teams/TeamManager.js';
import { AutonomousScheduler } from './schedulers/autonomous-scheduler.js';
import { CursorCopilotBridge } from './lib/agent/cursor-copilot-bridge.js';
import { startBackupWorker } from './workers/BackupWorker.js';
import { startCursorWorker } from './workers/CursorWorker.js';
import { startDriveWorker } from './workers/DriveWorker.js';
import { startEvolutionWorker } from './workers/evolution-worker.js';
import { startHealthWorker } from './workers/HealthWorker.js';
import { startN8nWorker } from './workers/N8nWorker.js';
import { startNotifyWorker } from './workers/NotifyWorker.js';
import { startAgentClassifierWorker } from './workers/AgentClassifierWorker.js';
import { startOllamaWorker } from './workers/OllamaWorker.js';
import { startSuspensionWorker } from './workers/SuspensionWorker.js';
import { startGeneralEventsWorker } from './workers/GeneralEventsWorker.js';
import { startIntentDispatchWorker } from './workers/IntentDispatchWorker.js';
import { startTerminalWorker } from './workers/TerminalWorker.js';
import { closeWebhookQueue, createWebhookWorker } from './workers/WebhookWorker.js';
import { startWebhooksProcessingWorker } from './workers/WebhooksProcessingWorker.js';
import { startLocalAgentsUnifiedWorker } from './workers/local-agent-http-worker.js';
import { startLocalClaudeWorker } from './workers/LocalClaudeWorker.js';
import { startLocalCopilotWorker } from './workers/LocalCopilotWorker.js';
import { startLocalOpenCodeWorker } from './workers/LocalOpenCodeWorker.js';
import { startLocalCursorWorker } from './workers/LocalCursorWorker.js';
import { startSandboxWorker } from './workers/SandboxWorker.js';
import { startSuperOrchestratorWorker } from './workers/SuperOrchestratorWorker.js';
import { startJcodeWorker } from './workers/JcodeWorker.js';
import { startHiveWorker } from './workers/HiveWorker.js';
import { startDefenseAuditWorker } from './workers/DefenseAuditWorker.js';
import { createResearchWorker } from './workers/ResearchWorker.js';
import { startApprovalGateWorker } from './workers/ApprovalGateWorker.js';
import { startOpenClawPlannerWorker } from './workers/OpenClawPlannerWorker.js';
import { startOpenClawSkepticWorker } from './workers/OpenClawSkepticWorker.js';
import { startAgentFarmWorker } from './workers/AgentFarmWorker.js';
import { superOrchestratorIntegration } from './super-orchestrator-integration.js';
// Maia Life Systems — 6 workers autónomos
import { startShieldScanWorker } from './workers/ShieldScanWorker.js';
import { startSigmaHarnessWorker } from './workers/SigmaHarnessWorker.js';
import { startSelfHealWorker } from './workers/SelfHealWorker.js';
import { startAutoDeployWorker } from './workers/AutoDeployWorker.js';
import { startCostGateWorker } from './workers/CostGateWorker.js';
import { startClaudeCodeWorker } from './workers/ClaudeCodeWorker.js';
import { startValidationWorker } from './workers/ValidationWorker.js';
import { startMemoryWriterWorker } from './workers/MemoryWriterWorker.js';
import { startContentVideoWorker } from './workers/ContentVideoWorker.js';

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
  const allowlist = parseWorkerAllowlist();
  const allow = (key: string): boolean => isWorkerAllowed(key, allowlist);
  const localAgentUnifiedOnly = process.env.OPSLY_LOCAL_AGENT_UNIFIED_ONLY === 'true';
  const superOrchestratorWorkerEnabled =
    process.env.OPSLY_SUPER_ORCHESTRATOR_WORKER_ENABLED === 'true';

  const cursorWorker = allow('cursor') ? startCursorWorker(connection) : undefined;
  const n8nWorker = allow('n8n') ? startN8nWorker(connection) : undefined;
  const notifyWorker = allow('notify') ? startNotifyWorker(connection) : undefined;
  const driveWorker = allow('drive') ? startDriveWorker(connection) : undefined;
  const backupWorker = allow('backup') ? startBackupWorker(connection) : undefined;
  const healthWorker = allow('health') ? startHealthWorker(connection) : undefined;
  const suspensionWorker = allow('suspension') ? startSuspensionWorker(connection) : undefined;
  const webhookWorker = allow('opsly-webhooks') ? createWebhookWorker() : undefined;
  const webhooksProcessingWorker = allow('webhooks-processing')
    ? startWebhooksProcessingWorker()
    : undefined;
  const generalEventsWorker = allow('general-events') ? startGeneralEventsWorker() : undefined;
  const ollamaWorker = allow('ollama') ? startOllamaWorker(connection) : undefined;
  const evolutionWorker = allow('evolution') ? startEvolutionWorker(connection) : undefined;
  const intentDispatchWorker = allow('intent_dispatch')
    ? startIntentDispatchWorker(connection)
    : undefined;
  const terminalWorker = allow('terminal_task') ? startTerminalWorker(connection) : undefined;
  const localAgentsWorker = allow('local-agents')
    ? startLocalAgentsUnifiedWorker(connection)
    : undefined;
  const localClaudeWorker =
    allow('local-claude') && !localAgentUnifiedOnly
      ? startLocalClaudeWorker(connection)
      : undefined;
  const localCopilotWorker =
    allow('local-copilot') && !localAgentUnifiedOnly
      ? startLocalCopilotWorker(connection)
      : undefined;
  const localOpenCodeWorker =
    allow('local-opencode') && !localAgentUnifiedOnly
      ? startLocalOpenCodeWorker(connection)
      : undefined;
  const localCursorWorker =
    allow('local-cursor') && !localAgentUnifiedOnly
      ? startLocalCursorWorker(connection)
      : undefined;
  const superOrchestratorWorker =
    allow('super-orchestrator') && superOrchestratorWorkerEnabled
      ? startSuperOrchestratorWorker(connection)
      : undefined;

  let agentClassifierCleanup: AsyncCleanup[] = [];
  if (
    allow('agent-classifier') &&
    process.env.OPSLY_AGENT_CLASSIFIER_WORKER_ENABLED === 'true'
  ) {
    const { worker: agentClassifierWorker, closeRedis } = startAgentClassifierWorker(connection);
    agentClassifierCleanup = [async () => agentClassifierWorker.close(), closeRedis];
  }

  const sandboxWorker =
    allow('sandbox') && process.env.OPSLY_SANDBOX_WORKER_ENABLED === 'true'
      ? startSandboxWorker(connection)
      : undefined;
  const jcodeWorker = allow('jcode') ? startJcodeWorker(connection) : undefined;
  const hiveWorker = allow('hive') ? startHiveWorker(connection) : undefined;
  const defenseAuditWorker = allow('defense-audit')
    ? startDefenseAuditWorker(connection)
    : undefined;
  const researchWorker = allow('research') ? createResearchWorker(connection) : undefined;
  const plannerWorker = allow('planner') ? startOpenClawPlannerWorker(connection) : undefined;
  const skepticWorker = allow('skeptic') ? startOpenClawSkepticWorker(connection) : undefined;
  const agentFarmWorkerEnabled = process.env.OPSLY_AGENT_FARM_WORKER_ENABLED === 'true';
  const agentFarmWorker =
    allow('agent-farm') && agentFarmWorkerEnabled
      ? startAgentFarmWorker(connection)
      : undefined;
  const approvalGateWorkerEnabled = process.env.OPSLY_APPROVAL_GATE_WORKER_ENABLED === 'true';
  const approvalGateResult =
    allow('approval-gate') && approvalGateWorkerEnabled
      ? startApprovalGateWorker(connection)
      : undefined;
  // Maia Life Systems
  const selfHealWorker = allow('self-heal') ? startSelfHealWorker(connection) : undefined;
  const autoDeployWorker = allow('auto-deploy') ? startAutoDeployWorker(connection) : undefined;
  const costGateWorker = allow('cost-gate') ? startCostGateWorker(connection) : undefined;
  const claudeCodeWorker = allow('claude-code') ? startClaudeCodeWorker(connection) : undefined;
  const validationWorker = allow('validation') ? startValidationWorker(connection) : undefined;
  const memoryWriterWorker = allow('memory-writer')
    ? startMemoryWriterWorker(connection)
    : undefined;
  const shieldScanWorker = allow('shield-scan') ? startShieldScanWorker() : undefined;
  const sigmaHarnessWorker =
    allow('sigma') && process.env.OPSLY_SIGMA_HARNESS_WORKER_ENABLED !== 'false'
      ? startSigmaHarnessWorker(connection)
      : undefined;

  const contentVideoWorker = allow('content-video') ? startContentVideoWorker() : undefined;

  const pushClose = (fn: AsyncCleanup | undefined): void => {
    if (fn) {
      cleanup.push(fn);
    }
  };

  pushClose(cursorWorker ? async () => cursorWorker.close() : undefined);
  pushClose(n8nWorker ? async () => n8nWorker.close() : undefined);
  pushClose(notifyWorker ? async () => notifyWorker.close() : undefined);
  pushClose(driveWorker ? async () => driveWorker.close() : undefined);
  pushClose(backupWorker ? async () => backupWorker.close() : undefined);
  pushClose(healthWorker ? async () => healthWorker.stop() : undefined);
  pushClose(suspensionWorker ? async () => suspensionWorker.close() : undefined);
  pushClose(webhookWorker ? async () => webhookWorker.close() : undefined);
  pushClose(webhooksProcessingWorker ? async () => webhooksProcessingWorker.close() : undefined);
  pushClose(generalEventsWorker ? async () => generalEventsWorker.close() : undefined);
  pushClose(ollamaWorker ? async () => ollamaWorker.close() : undefined);
  pushClose(evolutionWorker ? async () => evolutionWorker.close() : undefined);
  pushClose(intentDispatchWorker ? async () => intentDispatchWorker.close() : undefined);
  pushClose(terminalWorker ? async () => terminalWorker.close() : undefined);
  pushClose(localAgentsWorker ? async () => localAgentsWorker.close() : undefined);
  pushClose(localClaudeWorker ? async () => localClaudeWorker.close() : undefined);
  pushClose(localCopilotWorker ? async () => localCopilotWorker.close() : undefined);
  pushClose(localOpenCodeWorker ? async () => localOpenCodeWorker.close() : undefined);
  pushClose(localCursorWorker ? async () => localCursorWorker.close() : undefined);
  pushClose(superOrchestratorWorker ? async () => superOrchestratorWorker.close() : undefined);
  pushClose(sandboxWorker ? async () => sandboxWorker.close() : undefined);
  pushClose(jcodeWorker ? async () => jcodeWorker.close() : undefined);
  pushClose(hiveWorker ? async () => hiveWorker.close() : undefined);
  pushClose(defenseAuditWorker ? async () => defenseAuditWorker.close() : undefined);
  pushClose(researchWorker ? async () => researchWorker.close() : undefined);
  pushClose(plannerWorker ? async () => plannerWorker.close() : undefined);
  pushClose(skepticWorker ? async () => skepticWorker.close() : undefined);
  pushClose(agentFarmWorker ? async () => agentFarmWorker.close() : undefined);
  pushClose(approvalGateResult ? async () => approvalGateResult.worker.close() : undefined);
  cleanup.push(...agentClassifierCleanup);
  pushClose(selfHealWorker ? async () => selfHealWorker.close() : undefined);
  pushClose(autoDeployWorker ? async () => autoDeployWorker.close() : undefined);
  pushClose(costGateWorker ? async () => costGateWorker.close() : undefined);
  pushClose(claudeCodeWorker ? async () => claudeCodeWorker.close() : undefined);
  pushClose(validationWorker ? async () => validationWorker.close() : undefined);
  pushClose(memoryWriterWorker ? async () => memoryWriterWorker.close() : undefined);
  pushClose(shieldScanWorker ? async () => shieldScanWorker.stop() : undefined);
  pushClose(sigmaHarnessWorker ? async () => sigmaHarnessWorker.close() : undefined);
  pushClose(contentVideoWorker ? async () => contentVideoWorker.close() : undefined);

  const started = cleanup.length;
  const allowLabel =
    allowlist === null ? 'all' : [...allowlist].sort().join(',') || 'none';
  console.log(
    `[orchestrator] Workers started=${started} allowlist=${allowLabel}; Hermes tick → servicio opsly-hermes (no este proceso).`
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

  // Nodo prestado / best-effort: nunca control plane ni full-stack.
  if (process.env.OPSLY_EPHEMERAL_WORKER === 'true' && shouldRunControlPlane(role)) {
    throw new Error(
      'OPSLY_EPHEMERAL_WORKER=true forbids control/full roles — set OPSLY_ORCHESTRATOR_ROLE=worker'
    );
  }

  let teamManager: TeamManager | undefined;
  let autonomousScheduler: AutonomousScheduler | undefined;
  let cursorCopilotBridge: CursorCopilotBridge | undefined;
  let opslyCortex: OpslyCortex | undefined;
  const cleanupTasks: AsyncCleanup[] = [];

  if (shouldRunControlPlane(role)) {
    teamManager = new TeamManager(connection);
    console.log('[orchestrator] TeamManager: 4 equipos BullMQ activos');
    cleanupTasks.push(async () => teamManager?.close());
  }

  const healthServer = startOrchestratorHealthServer();
  cleanupTasks.push(async () => closeHttpServer(healthServer));

  if (shouldRunControlPlane(role) && process.env.OPSLY_RUNTIME_GOVERNOR_SWEEPER_ENABLED !== 'false') {
    startRuntimeGovernorSweeper(5);
  }
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

  if (shouldRunControlPlane(role) && process.env.OPSLY_CORTEX_ENABLED === 'true') {
    opslyCortex = new OpslyCortex();
    opslyCortex.start();
    cleanupTasks.push(async () => {
      opslyCortex?.stop();
    });
  }

  if (shouldRunWorkers(role)) {
    cleanupTasks.push(...startAllWorkers());
  }

  // Initialize Super Orchestrator integration
  if (shouldRunControlPlane(role)) {
    try {
      await superOrchestratorIntegration.initialize();
      console.log('[orchestrator] Super Orchestrator v2 initialized');
    } catch (err) {
      console.error('[orchestrator] Super Orchestrator init failed:', err);
    }
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
      tenant_slug: 'opsly',
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  }
}

void main();
