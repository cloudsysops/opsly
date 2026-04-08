import { subscribeEvents } from "./events/bus.js";
import { processIntent } from "./engine.js";
import { connection } from "./queue.js";
import { startOrchestratorHealthServer } from "./health-server.js";
import { TeamManager } from "./teams/TeamManager.js";
import { startCursorWorker } from "./workers/CursorWorker.js";
import { startDriveWorker } from "./workers/DriveWorker.js";
import { startN8nWorker } from "./workers/N8nWorker.js";
import { startNotifyWorker } from "./workers/NotifyWorker.js";

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

async function main(): Promise<void> {
  console.log("[orchestrator] Iniciando…");

  // TeamManager + misma conexión Redis que openclaw (queue.ts); eventos → assignToTeam p.ej. deploy
  const teamManager = new TeamManager(connection);
  console.log("[orchestrator] TeamManager: 4 equipos BullMQ activos");

  startOrchestratorHealthServer();

  void runEventSubscription(teamManager).catch((err) => {
    console.error("[orchestrator] runEventSubscription", err);
  });

  startCursorWorker(connection);
  startN8nWorker(connection);
  startNotifyWorker(connection);
  startDriveWorker(connection);

  const shutdown = (): void => {
    void (async () => {
      console.log("[orchestrator] Shutdown, cerrando TeamManager…");
      await teamManager.close();
      process.exit(0);
    })();
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);

  const result = await processIntent({
    intent: "notify",
    context: { title: "OpenClaw", message: "orchestrator started", type: "info" },
    initiated_by: "system",
  });

  process.stdout.write(`${JSON.stringify(result)}\n`);
}

void main();
