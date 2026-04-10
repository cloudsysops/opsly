import { createServer } from "node:http";
import { buildContextFromQuery } from "./knowledge-context.js";

const DEFAULT_PORT = 3012;

function parsePort(): number {
  const raw = process.env.CONTEXT_BUILDER_PORT || String(DEFAULT_PORT);
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PORT;
}

function readBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => {
      chunks.push(c);
    });
    req.on("end", () => {
      resolve(Buffer.concat(chunks).toString("utf8"));
    });
    req.on("error", reject);
  });
}

export function startContextBuilderServer(): void {
  const port = parsePort();
  const server = createServer((req, res) => {
    void (async () => {
      try {
        const pathOnly = req.url?.split("?")[0] ?? "/";
        if (req.method === "GET" && pathOnly === "/health") {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ status: "ok", service: "context-builder" }));
          return;
        }
        if (req.method === "POST" && pathOnly === "/v1/context") {
          let raw: string;
          try {
            raw = await readBody(req);
          } catch {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "invalid_body" }));
            return;
          }
          let body: { query?: string };
          try {
            body = JSON.parse(raw) as { query?: string };
          } catch {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "json_parse" }));
            return;
          }
          const query = typeof body.query === "string" ? body.query : "";
          const result = await buildContextFromQuery(query);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              context: result.context,
              cache_hit: result.cache_hit,
              sources: result.sources,
              digest: result.digest,
            }),
          );
          return;
        }
        res.writeHead(404);
        res.end();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "internal_error", message: msg }));
      }
    })();
  });
  server.listen(port, "0.0.0.0", () => {
    process.stdout.write(
      JSON.stringify({
        service: "context-builder",
        http: "listening",
        port,
        paths: ["/health", "/v1/context"],
      }) + "\n",
    );
  });
}
