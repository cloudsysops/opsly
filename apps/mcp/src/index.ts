import { createServer } from "./server.js";

async function main(): Promise<void> {
  const server = createServer();
  // Mantiene proceso vivo para integración por stdio/runner externo.
  process.stdout.write(
    JSON.stringify({
      service: server.name,
      version: server.version,
      tools: server.listTools(),
      status: "running"
    }) + "\n"
  );
}

void main();
