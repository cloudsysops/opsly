#!/usr/bin/env node
import { createHermesOrchestrator } from './HermesOrchestrator.js';

function printHelp(): void {
  process.stdout.write(`Hermes CLI (orchestrator)
  tsx src/hermes/cli.ts <command>

Commands:
  tick | run     Ejecuta un ciclo Hermes (misma lógica que el worker BullMQ)
  status         Muestra flags de entorno relevantes
  help
`);
}

async function main(): Promise<void> {
  const cmd = process.argv[2] ?? 'help';
  if (cmd === 'help' || cmd === '-h' || cmd === '--help') {
    printHelp();
    return;
  }
  if (cmd === 'status') {
    process.stdout.write(
      `${JSON.stringify({
        HERMES_ENABLED: process.env.HERMES_ENABLED === 'true',
        HERMES_SPRINT: process.env.HERMES_SPRINT ?? '1',
        HERMES_DISPATCH_OPENCLAW: process.env.HERMES_DISPATCH_OPENCLAW === 'true',
        HERMES_DISCORD_NOTIFY: process.env.HERMES_DISCORD_NOTIFY === 'true',
      })}\n`
    );
    return;
  }
  if (cmd === 'tick' || cmd === 'run') {
    const o = createHermesOrchestrator();
    await o.initialize();
    const out = await o.runTick();
    process.stdout.write(`${JSON.stringify(out)}\n`);
    return;
  }
  printHelp();
  process.exitCode = 1;
}

void main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
