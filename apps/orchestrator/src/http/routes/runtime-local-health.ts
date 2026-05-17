import type { RouteContext } from '../router.js';
import { jsonResponse } from '../router.js';
import { collectRuntimeHealthSnapshot } from '../../runtime/runtime-health.js';

export async function handleRuntimeNodesStatus(ctx: RouteContext): Promise<void> {
  const snapshot = await collectRuntimeHealthSnapshot();
  jsonResponse(ctx.res, 200, { ok: true, ...snapshot });
}

export async function handleRuntimeStream(ctx: RouteContext): Promise<void> {
  const { res, req } = ctx;
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  let closed = false;
  req.on('close', () => {
    closed = true;
  });

  const push = async (): Promise<void> => {
    if (closed) {
      return;
    }
    try {
      const snapshot = await collectRuntimeHealthSnapshot();
      res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      res.write(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`);
    }
  };

  await push();
  const timer = setInterval(() => {
    void push();
  }, 3000);

  req.on('close', () => {
    clearInterval(timer);
  });
}
