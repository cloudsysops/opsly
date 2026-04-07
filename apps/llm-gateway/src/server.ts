import { createServer } from "node:http";

const DEFAULT_PORT = 3010;

function parsePort(): number {
  const raw = process.env.LLM_GATEWAY_PORT || String(DEFAULT_PORT);
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PORT;
}

export function startLlmGatewayHealthServer(): void {
  const port = parsePort();
  const server = createServer((req, res) => {
    const pathOnly = req.url?.split("?")[0] ?? "/";
    if (req.method === "GET" && pathOnly === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "llm-gateway" }));
      return;
    }
    res.writeHead(404);
    res.end();
  });
  server.listen(port, "0.0.0.0", () => {
    process.stdout.write(
      JSON.stringify({ service: "llm-gateway", http: "listening", port, path: "/health" }) + "\n",
    );
  });
}

startLlmGatewayHealthServer();
