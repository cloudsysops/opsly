import { healthDaemon } from "./health-daemon.js";
import { createHealthServer } from "./health-server.js";

async function main(): Promise<void> {
  await healthDaemon.start();
  console.log("[llm-gateway] Health daemon iniciado");

  createHealthServer();

  process.on("SIGTERM", async () => {
    console.log("[llm-gateway] Shutdown...");
    await healthDaemon.stop();
    process.exit(0);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
