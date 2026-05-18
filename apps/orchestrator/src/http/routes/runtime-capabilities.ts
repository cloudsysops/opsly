import type { RouteContext } from '../router.js';
import { jsonResponse } from '../router.js';
import { collectRuntimeHealthSnapshot } from '../../runtime/runtime-health.js';

export async function handleRuntimeCapabilities(ctx: RouteContext): Promise<void> {
  const snapshot = await collectRuntimeHealthSnapshot();
  jsonResponse(ctx.res, 200, {
    ok: true,
    generated_at: snapshot.timestamp,
    capabilities: snapshot.capabilities,
    session_summary: snapshot.sessionSummary,
  });
}
