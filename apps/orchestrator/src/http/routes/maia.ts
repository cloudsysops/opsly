import type { RouteContext } from '../router.js';
import { jsonResponse } from '../router.js';

export async function handleMaiaCallback(ctx: RouteContext): Promise<void> {
  jsonResponse(ctx.res, 501, { error: 'maia callback not configured' });
}

export async function handleMaiaSelfHeal(ctx: RouteContext): Promise<void> {
  jsonResponse(ctx.res, 501, { error: 'maia self-heal not configured' });
}
