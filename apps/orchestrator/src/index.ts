import { setupLangSmithTracing } from "./agents/langsmith.js";
import { processIntent } from "./engine.js";
import { subscribeEvents } from "./events/bus.js";
import { startOrchestratorHealthServer } from "./health-server.js";
import {
  parseOrchestratorRole,
  shouldRunControlPlane,
  shouldRunWorkers,
} from "./orchestrator-role.js";
import { connection, orchestratorQueue } from "./queue.js";
import { TeamManager } from "./teams/TeamManager.js";
import { startBackupWorker } from "./workers/BackupWorker.js";
import { startCursorWorker } from "./workers/CursorWorker.js";
import { startDriveWorker } from "./workers/DriveWorker.js";
import { startHealthWorker } from "./workers/HealthWorker.js";
import { startN8nWorker } from "./workers/N8nWorker.js";
import { startNotifyWorker } from "./workers/NotifyWorker.js";
import { startSuspensionWorker } from "./workers/SuspensionWorker.js";
import { startGeneralEventsWorker } from "./workers/GeneralEventsWorker.js";
import { closeWebhookQueue, createWebhookWorker } from "./workers/WebhookWorker.js";
import { startWebhooksProcessingWorker } from "./workers/WebhooksProcessingWorker.js";

type AsyncCleanup = () => Promise<void>;

async function runEventSubscription(teamManager: TeamManager): Promise<AsyncCleanup> {
  const subscription = await subscribeEvents(async (event, eventData) => {
    console.log(`[orchestrator] Evento: ${event}`, eventData);

    switch (event) {
      case "tenant.onboarded": {
        try {
          const jobId = await teamManager.assignToTeam("deploy", eventData);
          console.log("[orchestrator] tenant.onboarded → team deploy job", jobId);
        } catch (err) {
          console.error("[orchestrator] assignToTeam(deploy) failed", err);
        }
        break;
      }
      case "job.completed": {
        console.log(`[orchestrator] Job completado: ${String(eventData.job_id ?? "")}`);
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
  );

  console.log(
    "[orchestrator] Workers: cursor, n8n, notify, drive, backup, health, budget, opsly-webhooks, webhooks-processing, general-events",
  );
  return cleanup;
}

async function closeHttpServer(
  server: ReturnType<typeof startOrchestratorHealthServer>,
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
  console.log(`[orchestrator] Iniciando… (OPSLY_ORCHESTRATOR_ROLE=${role})`);

  let teamManager: TeamManager | undefined;
  const cleanupTasks: AsyncCleanup[] = [];

  if (shouldRunControlPlane(role)) {
    teamManager = new TeamManager(connection);
    console.log("[orchestrator] TeamManager: 4 equipos BullMQ activos");
    cleanupTasks.push(async () => teamManager?.close());
  }

  const healthServer = startOrchestratorHealthServer();
  cleanupTasks.push(async () => closeHttpServer(healthServer));
  cleanupTasks.push(async () => orchestratorQueue.close());
  cleanupTasks.push(async () => closeWebhookQueue());

  if (shouldRunControlPlane(role) && teamManager) {
    try {
      cleanupTasks.push(await runEventSubscription(teamManager));
    } catch (err) {
      console.error("[orchestrator] runEventSubscription", err);
    }
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
      const results = await Promise.allSettled(
        cleanupTasks.map(async (cleanup) => cleanup()),
      );
      for (const result of results) {
        if (result.status === "rejected") {
          console.error("[orchestrator] cleanup failed", result.reason);
        }
      }
      process.exit(0);
    })().catch((err) => {
      console.error("[orchestrator] shutdown failed", err);
      process.exit(1);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  if (shouldRunControlPlane(role)) {
    const result = await processIntent({
      intent: "notify",
      context: { title: "OpenClaw", message: "orchestrator started", type: "info" },
      initiated_by: "system",
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  }
}

void main();
