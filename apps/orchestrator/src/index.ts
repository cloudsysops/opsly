import { processIntent } from "./engine.js";

async function main(): Promise<void> {
  const result = await processIntent({
    intent: "notify",
    context: { message: "OpenClaw orchestrator started" },
    initiated_by: "system"
  });

  process.stdout.write(`${JSON.stringify(result)}\n`);
}

void main();
