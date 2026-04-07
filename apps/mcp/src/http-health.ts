import { createServer } from "node:http";

const DEFAULT_PORT = 3003;

function parsePort(): number {
  const raw = process.env.PORT || String(DEFAULT_PORT);
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PORT;
}

/** Expone GET /health para Traefik y healthchecks (el servidor MCP en memoria sigue en createServer). */
export function startMcpHttpHealth(): void {
  const port = parsePort();
  const httpServer = createServer((req, res) => {
    const pathOnly = req.url?.split("?")[0] ?? "/";
    if (req.method === "GET" && pathOnly === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "mcp" }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  httpServer.listen(port, "0.0.0.0", () => {
    process.stdout.write(
      JSON.stringify({ service: "mcp", http: "listening", port, path: "/health" }) + "\n",
    );
  });
}
