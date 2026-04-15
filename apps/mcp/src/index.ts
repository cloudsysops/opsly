import { startMcpHttpHealth } from "./http-health.js";
import { startMcpStdioServer } from "./mcp-sdk-bridge.js";
import { createServer, getAllToolDefinitions } from "./server.js";

function useStdioTransport(): boolean {
  const env = process.env.MCP_TRANSPORT?.trim().toLowerCase();
  if (env === "stdio") {
    return true;
  }
  return process.argv.includes("--stdio");
}

async function main(): Promise<void> {
  const openClaw = createServer();
  const definitions = getAllToolDefinitions();
  startMcpHttpHealth();

  if (useStdioTransport()) {
    await startMcpStdioServer(openClaw, definitions);
    return;
  }

  process.stdout.write(
    JSON.stringify({
      service: openClaw.name,
      version: openClaw.version,
      tools: openClaw.listTools(),
      status: "running",
      transport: "http",
    }) + "\n",
  );
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err);
  process.stderr.write(`${msg}\n`);
  process.exit(1);
});
