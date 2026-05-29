import type { RouteContext } from '../router.js';
import { verifyPlatformAdminToken, parseBody, assertTenantSlugOrThrow } from '../utils.js';
import { jsonResponse, errorResponse } from '../router.js';
import { StickerContextService } from '../../services/sticker-context.js';

let stickerContextService: StickerContextService | null = null;

async function getStickerContextService(): Promise<StickerContextService> {
  if (!stickerContextService) {
    stickerContextService = new StickerContextService();
  }
  return stickerContextService;
}

function validateChatRequest(body: unknown): {
  message: string;
  tenantSlug: string;
  userId: string;
  channel: string;
  messageId: string;
} | null {
  if (typeof body !== 'object' || body === null) {
    return null;
  }

  const b = body as Record<string, unknown>;
  const message = typeof b.message === 'string' ? b.message.trim() : '';
  const tenantSlug = typeof b.tenantSlug === 'string' ? b.tenantSlug.trim() : '';
  const userId = typeof b.userId === 'string' ? b.userId.trim() : '';
  const channel = typeof b.channel === 'string' ? b.channel.trim() : '';
  const messageId = typeof b.messageId === 'string' ? b.messageId.trim() : '';

  if (!message || !tenantSlug || !userId) {
    return null;
  }

  return { message, tenantSlug, userId, channel, messageId };
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

  const validated = validateChatRequest(body);
  if (!validated) {
    errorResponse(ctx.res, 400, 'message, tenantSlug, userId required');
    return;
  }

  try {
    assertTenantSlugOrThrow(validated.tenantSlug);
  } catch (err) {
    errorResponse(ctx.res, 400, err instanceof Error ? err.message : String(err));
    return;
  }

  try {
    const service = await getStickerContextService();
    const response = await service.processUserMessage({
      message: validated.message,
      tenantSlug: validated.tenantSlug,
      userId: validated.userId,
      channel: validated.channel || 'whatsapp',
      messageId: validated.messageId || '',
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
