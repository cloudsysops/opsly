import type { RouteContext } from '../router.js';
import { jsonResponse } from '../router.js';

export async function handleMissionControlChat(ctx: RouteContext): Promise<void> {
  jsonResponse(ctx.res, 501, { error: 'mission-control chat not configured on this build' });
}
