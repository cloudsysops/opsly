import { setupLangSmithTracing } from "./agents/langsmith.js";
import { processIntent } from "./engine.js";
import { subscribeEvents } from "./events/bus.js";
import { startOrchestratorHealthServer } from "./health-server.js";
import {
  parseOrchestratorRole,
  shouldRunControlPlane,
  shouldRunWorkers,
} from "./orchestrator-role.js";
import { connection } from "./queue.js";
import { TeamManager } from "./teams/TeamManager.js";
import { startBackupWorker } from "./workers/BackupWorker.js";
import { startCursorWorker } from "./workers/CursorWorker.js";
import { startDriveWorker } from "./workers/DriveWorker.js";
import { startHealthWorker } from "./workers/HealthWorker.js";
import { startN8nWorker } from "./workers/N8nWorker.js";
import { startNotifyWorker } from "./workers/NotifyWorker.js";
import { startSuspensionWorker } from "./workers/SuspensionWorker.js";
import { startGeneralEventsWorker } from "./workers/GeneralEventsWorker.js";
import { createWebhookWorker } from "./workers/WebhookWorker.js";
import { startWebhooksProcessingWorker } from "./workers/WebhooksProcessingWorker.js";

async function runEventSubscription(teamManager: TeamManager): Promise<void> {
  await subscribeEvents(async (event, eventData) => {
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
}

function startAllWorkers(): void {
  startCursorWorker(connection);
  startN8nWorker(connection);
  startNotifyWorker(connection);
  startDriveWorker(connection);
  startBackupWorker(connection);
  startHealthWorker(connection);
  startSuspensionWorker(connection);
  createWebhookWorker();
  startWebhooksProcessingWorker();
  startGeneralEventsWorker();
  console.log(
    "[orchestrator] Workers: cursor, n8n, notify, drive, backup, health, budget, opsly-webhooks, webhooks-processing, general-events",
  );
}

async function main(): Promise<void> {
  setupLangSmithTracing();
  const role = parseOrchestratorRole();
  console.log(`[orchestrator] Iniciando… (OPSLY_ORCHESTRATOR_ROLE=${role})`);

  let teamManager: TeamManager | undefined;

  if (shouldRunControlPlane(role)) {
    teamManager = new TeamManager(connection);
    console.log("[orchestrator] TeamManager: 4 equipos BullMQ activos");
  }

  startOrchestratorHealthServer();

  if (shouldRunControlPlane(role) && teamManager) {
    void runEventSubscription(teamManager).catch((err) => {
      console.error("[orchestrator] runEventSubscription", err);
    });
  }

  if (shouldRunWorkers(role)) {
    startAllWorkers();
  }

  const shutdown = (): void => {
    void (async () => {
      if (teamManager) {
        console.log("[orchestrator] Shutdown, cerrando TeamManager…");
        await teamManager.close();
      } else {
        console.log("[orchestrator] Shutdown (modo worker)");
      }
      process.exit(0);
    })();
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

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
