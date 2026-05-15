import { setupLangSmithTracing } from './agents/langsmith.js';
import { processIntent } from './engine.js';
import { subscribeEvents } from './events/bus.js';
import { startOrchestratorHealthServer } from './health-server.js';
import {
  startRuntimeGovernorSweeper,
  stopRuntimeGovernorSweeper,
} from './lib/runtime-governor-sweeper.js';
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
import { startRuntimeSessionWorker } from './workers/RuntimeSessionWorker.js';
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
import { startSelfHealWorker } from './workers/SelfHealWorker.js';
import { startAutoDeployWorker } from './workers/AutoDeployWorker.js';
import { startCostGateWorker } from './workers/CostGateWorker.js';
import { startClaudeCodeWorker } from './workers/ClaudeCodeWorker.js';
import { startValidationWorker } from './workers/ValidationWorker.js';
import { startMemoryWriterWorker } from './workers/MemoryWriterWorker.js';

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
  const localAgentUnifiedOnly = process.env.OPSLY_LOCAL_AGENT_UNIFIED_ONLY === 'true';
  const superOrchestratorWorkerEnabled =
    process.env.OPSLY_SUPER_ORCHESTRATOR_WORKER_ENABLED === 'true';
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
  const evolutionWorker = startEvolutionWorker(connection);
  const intentDispatchWorker = startIntentDispatchWorker(connection);
  const terminalWorker = startTerminalWorker(connection);
  const runtimeSessionWorker = startRuntimeSessionWorker(connection);
  const localAgentsWorker = startLocalAgentsUnifiedWorker(connection);
  const localClaudeWorker = localAgentUnifiedOnly ? undefined : startLocalClaudeWorker(connection);
  const localCopilotWorker = localAgentUnifiedOnly ? undefined : startLocalCopilotWorker(connection);
  const localOpenCodeWorker = localAgentUnifiedOnly ? undefined : startLocalOpenCodeWorker(connection);
  const localCursorWorker = localAgentUnifiedOnly ? undefined : startLocalCursorWorker(connection);
  const superOrchestratorWorker = superOrchestratorWorkerEnabled
  ? startSuperOrchestratorWorker(connection)
  : undefined;

  let agentClassifierCleanup: AsyncCleanup[] = [];
  if (process.env.OPSLY_AGENT_CLASSIFIER_WORKER_ENABLED === 'true') {
    const { worker: agentClassifierWorker, closeRedis } = startAgentClassifierWorker(connection);
    agentClassifierCleanup = [async () => agentClassifierWorker.close(), closeRedis];
  }

  const sandboxWorker =
  process.env.OPSLY_SANDBOX_WORKER_ENABLED === 'true' ? startSandboxWorker(connection) : undefined;
  const jcodeWorker = startJcodeWorker(connection);
  const hiveWorker = startHiveWorker(connection);
  const defenseAuditWorker = startDefenseAuditWorker(connection);
  const researchWorker = createResearchWorker(connection);
  const plannerWorker = startOpenClawPlannerWorker(connection);
  const skepticWorker = startOpenClawSkepticWorker(connection);
  const agentFarmWorkerEnabled = process.env.OPSLY_AGENT_FARM_WORKER_ENABLED === 'true';
  const agentFarmWorker = agentFarmWorkerEnabled ? startAgentFarmWorker(connection) : undefined;
  const approvalGateWorkerEnabled = process.env.OPSLY_APPROVAL_GATE_WORKER_ENABLED === 'true';
  const approvalGateResult = approvalGateWorkerEnabled ? startApprovalGateWorker(connection) : undefined;
  // Maia Life Systems
  const selfHealWorker = startSelfHealWorker(connection);
  const autoDeployWorker = startAutoDeployWorker(connection);
  const costGateWorker = startCostGateWorker(connection);
  const claudeCodeWorker = startClaudeCodeWorker(connection);
  const validationWorker = startValidationWorker(connection);
  const memoryWriterWorker = startMemoryWriterWorker(connection);

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
    async () => evolutionWorker.close(),
    async () => intentDispatchWorker.close(),
    async () => terminalWorker.close(),
    async () => localAgentsWorker.close(),
    ...(localClaudeWorker ? [async () => localClaudeWorker.close()] : []),
    ...(localCopilotWorker ? [async () => localCopilotWorker.close()] : []),
    ...(localOpenCodeWorker ? [async () => localOpenCodeWorker.close()] : []),
    ...(localCursorWorker ? [async () => localCursorWorker.close()] : []),
    ...(superOrchestratorWorker ? [async () => superOrchestratorWorker.close()] : []),
  ...(sandboxWorker ? [async () => sandboxWorker.close()] : []),
  async () => jcodeWorker.close(),
  async () => hiveWorker.close(),
  async () => defenseAuditWorker.close(),
  async () => researchWorker.close(),
  async () => plannerWorker.close(),
  async () => skepticWorker.close(),
  ...(agentFarmWorker ? [async () => agentFarmWorker.close()] : []),
  ...(approvalGateResult ? [async () => approvalGateResult.worker.close()] : []),
  ...agentClassifierCleanup,
    // Maia Life Systems
    async () => selfHealWorker.close(),
    async () => autoDeployWorker.close(),
    async () => costGateWorker.close(),
    async () => claudeCodeWorker.close(),
    async () => validationWorker.close(),
    async () => memoryWriterWorker.close(),
  );

  const localWorkersLabel = localAgentUnifiedOnly
    ? 'local-agents unified-only'
    : 'local-agents (cursor/claude/copilot/opencode), local-claude, local-copilot, local-opencode, local-cursor';
  const superWorkerLabel = superOrchestratorWorkerEnabled ? ', super-orchestrator' : '';
  const agentFarmLabel = agentFarmWorkerEnabled ? ', agent-farm' : '';
  const approvalGateLabel = approvalGateWorkerEnabled ? ', approval-gate' : '';
  console.log(
    `[orchestrator] Workers: cursor, n8n, notify, drive, backup, health, budget, opsly-webhooks, webhooks-processing, general-events, ollama, evolution, intent_dispatch, terminal_task, runtime_session, jcode, hive, defense-audit, research, planner, skeptic${localWorkersLabel}${superWorkerLabel}${agentFarmLabel}${approvalGateLabel}` +
    (process.env.OPSLY_AGENT_CLASSIFIER_WORKER_ENABLED === 'true' ? ', agent-classifier' : '') +
    (process.env.OPSLY_SANDBOX_WORKER_ENABLED === 'true' ? ', sandbox' : '') +
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
  let opslyCortex: OpslyCortex | undefined;
  const cleanupTasks: AsyncCleanup[] = [];

  if (shouldRunControlPlane(role)) {
    teamManager = new TeamManager(connection);
    console.log('[orchestrator] TeamManager: 4 equipos BullMQ activos');
    cleanupTasks.push(async () => teamManager?.close());
  }

  const healthServer = startOrchestratorHealthServer();
  if (process.env.OPSLY_RUNTIME_GOVERNOR_SWEEPER !== '0') {
    startRuntimeGovernorSweeper(5);
    cleanupTasks.push(async () => stopRuntimeGovernorSweeper());
  }
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
