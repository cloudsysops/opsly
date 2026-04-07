import { createServer } from "node:http";

const DEFAULT_PORT = 3011;

function parsePort(): number {
  const raw = process.env.ORCHESTRATOR_HEALTH_PORT || String(DEFAULT_PORT);
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PORT;
}

/** HTTP liveness for Docker/orquestadores (proceso distinto del puerto Traefik). */
export function startOrchestratorHealthServer(): void {
  const port = parsePort();
  const server = createServer((req, res) => {
    const pathOnly = req.url?.split("?")[0] ?? "/";
    if (req.method === "GET" && pathOnly === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "orchestrator" }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.listen(port, "0.0.0.0", () => {
    process.stdout.write(
      JSON.stringify({ service: "orchestrator", http: "listening", port, path: "/health" }) + "\n",
    );
  });
}
