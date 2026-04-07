import { processIntent } from "./engine.js";
import { connection } from "./queue.js";
import { startOrchestratorHealthServer } from "./health-server.js";
import { startCursorWorker } from "./workers/CursorWorker.js";
import { startDriveWorker } from "./workers/DriveWorker.js";
import { startN8nWorker } from "./workers/N8nWorker.js";
import { startNotifyWorker } from "./workers/NotifyWorker.js";

async function main(): Promise<void> {
  startOrchestratorHealthServer();
  startCursorWorker(connection);
  startN8nWorker(connection);
  startNotifyWorker(connection);
  startDriveWorker(connection);

  const result = await processIntent({
    intent: "notify",
    context: { title: "OpenClaw", message: "orchestrator started", type: "info" },
    initiated_by: "system"
  });

  process.stdout.write(`${JSON.stringify(result)}\n`);
}

void main();
