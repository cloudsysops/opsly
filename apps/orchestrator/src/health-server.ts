import {
  createServer,
  type IncomingMessage,
  type Server,
  type ServerResponse,
} from "node:http";
import { enqueueWebhookJob } from "./workers/WebhookWorker.js";
import type { WebhookJobData } from "./workers/WebhookWorker.js";

const DEFAULT_PORT = 3011;

function parsePort(): number {
  const raw = process.env.ORCHESTRATOR_HEALTH_PORT || String(DEFAULT_PORT);
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PORT;
}

async function readBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(data));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

async function handleEnqueueWebhook(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  try {
    const body = (await readBody(req)) as WebhookJobData;
    await enqueueWebhookJob(body);
    res.writeHead(202, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ ok: true }));
  } catch (err) {
    res.writeHead(400, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(err) }));
  }
}

/** HTTP liveness + internal webhook enqueue endpoint. */
export function startOrchestratorHealthServer(): Server {
  const port = parsePort();
  const server = createServer(async (req, res) => {
    const pathOnly = req.url?.split("?")[0] ?? "/";

    if (req.method === "GET" && pathOnly === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok", service: "orchestrator" }));
      return;
    }

    if (req.method === "POST" && pathOnly === "/internal/enqueue-webhook") {
      await handleEnqueueWebhook(req, res);
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
  return server;
}
