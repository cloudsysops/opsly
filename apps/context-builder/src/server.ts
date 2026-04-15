import { createServer } from "node:http";
import { buildContextPack } from "./context-pack-builder.js";
import { buildContextFromQuery } from "./knowledge-context.js";

const DEFAULT_PORT = 3012;

const CONTEXT_PACK_PATH = "/v1/internal/opsly/context-pack";

function authorizeContextPack(
  req: import("node:http").IncomingMessage,
): boolean {
  const token =
    process.env.CONTEXT_PACK_TOKEN?.trim() ||
    process.env.PLATFORM_ADMIN_TOKEN?.trim();
  if (!token) {
    return false;
  }
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) {
    return false;
  }
  return auth.slice(7) === token;
}

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
        if (req.method === "POST" && pathOnly === CONTEXT_PACK_PATH) {
          if (!authorizeContextPack(req)) {
            res.writeHead(401, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({
                error: "unauthorized",
                hint: "Set CONTEXT_PACK_TOKEN or PLATFORM_ADMIN_TOKEN and send Authorization: Bearer",
              }),
            );
            return;
          }
          let raw: string;
          try {
            raw = await readBody(req);
          } catch {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "invalid_body" }));
            return;
          }
          let body: { tenant_id?: string; tenant_slug?: string };
          try {
            body = JSON.parse(raw) as { tenant_id?: string; tenant_slug?: string };
          } catch {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "json_parse" }));
            return;
          }
          try {
            const pack = await buildContextPack({
              tenantId:
                typeof body.tenant_id === "string" ? body.tenant_id : undefined,
              tenantSlug:
                typeof body.tenant_slug === "string"
                  ? body.tenant_slug
                  : undefined,
            });
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify(pack));
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            if (msg === "missing_tenant") {
              res.writeHead(400, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: "missing_tenant",
                  hint: "Provide tenant_id (uuid) or tenant_slug in JSON body",
                }),
              );
              return;
            }
            if (msg === "tenant_not_found") {
              res.writeHead(404, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ error: "tenant_not_found" }));
              return;
            }
            if (msg === "supabase_not_configured") {
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  error: "supabase_not_configured",
                  hint: "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY",
                }),
              );
              return;
            }
            res.writeHead(500, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "context_pack_failed", message: msg }));
          }
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
        paths: ["/health", "/v1/context", CONTEXT_PACK_PATH],
      }) + "\n",
    );
  });
}
