import type { RouteContext } from '../router.js';
import { jsonResponse } from '../router.js';

export async function handleExternalAgentsRegistry(ctx: RouteContext): Promise<void> {
  jsonResponse(ctx.res, 200, { ok: true, agents: [] });
}
