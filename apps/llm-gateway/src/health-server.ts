import { createServer } from 'node:http';
import { handleApprovalAnalyzeHttp } from './approval-route.js';
import { handlePlannerHttp } from './planner-route.js';
import { handleSearchHttp } from './search-route.js';
import { handleTextCompletionHttp } from './text-completion-route.js';

const DEFAULT_PORT = 3010;

function parsePort(): number {
  const raw = process.env.LLM_GATEWAY_PORT ?? String(DEFAULT_PORT);
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_PORT;
}

/** HTTP health + Remote Planner endpoint for the LLM gateway process. */
export function createHealthServer(port?: number): void {
  const p = port ?? parsePort();
  const server = createServer((req, res) => {
    void (async () => {
      try {
        const textHandled = await handleTextCompletionHttp(req, res);
        if (textHandled) {
          return;
        }
        const searchHandled = await handleSearchHttp(req, res);
        if (searchHandled) {
          return;
        }
        const approvalHandled = await handleApprovalAnalyzeHttp(req, res);
        if (approvalHandled) {
          return;
        }
        const handled = await handlePlannerHttp(req, res);
        if (handled) {
          return;
        }
        const pathOnly = req.url?.split('?')[0] ?? '/';
        if (req.method === 'GET' && pathOnly === '/health') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: 'ok', service: 'llm-gateway' }));
          return;
        }
        res.writeHead(404);
        res.end();
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'internal_error', message: msg }));
      }
    })();
  });
  server.listen(p, '0.0.0.0', () => {
    process.stdout.write(
      JSON.stringify({ service: 'llm-gateway', http: 'listening', port: p, path: '/health' }) + '\n'
    );
  });
}
