import type { RouteContext } from '../router.js';
import {
  verifyPlatformAdminToken,
  parseBody,
  assertTenantSlugOrThrow,
} from '../utils.js';
import { jsonResponse, errorResponse } from '../router.js';
import { StickerContextService } from '../../services/sticker-context.js';

let stickerContextService: StickerContextService | null = null;

async function getStickerContextService(): Promise<StickerContextService> {
  if (!stickerContextService) {
    stickerContextService = new StickerContextService();
  }
  return stickerContextService;
}

export async function handlePaniniChat(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }

  let body: unknown;
  try {
    body = await parseBody(ctx.req);
  } catch {
    errorResponse(ctx.res, 400, 'Invalid JSON');
    return;
  }

  if (typeof body !== 'object' || body === null) {
    errorResponse(ctx.res, 400, 'invalid body');
    return;
  }

  const b = body as Record<string, unknown>;
  const message = typeof b.message === 'string' ? b.message.trim() : '';
  const tenantSlug = typeof b.tenantSlug === 'string' ? b.tenantSlug.trim() : '';
  const userId = typeof b.userId === 'string' ? b.userId.trim() : '';
  const channel = typeof b.channel === 'string' ? b.channel.trim() : '';
  const messageId = typeof b.messageId === 'string' ? b.messageId.trim() : '';

  if (!message || !tenantSlug || !userId) {
    errorResponse(ctx.res, 400, 'message, tenantSlug, userId required');
    return;
  }

  try {
    assertTenantSlugOrThrow(tenantSlug);
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
    return;
  }

  try {
    const service = await getStickerContextService();
    const response = await service.processUserMessage({
      message,
      tenantSlug,
      userId,
      channel: channel || 'whatsapp',
      messageId: messageId || '',
    });

    jsonResponse(ctx.res, 200, {
      ok: true,
      output: response.output,
      suggestedActions: response.suggestedActions || [],
    });
  } catch (err) {
    errorResponse(ctx.res, 500, String(err));
  }
}
