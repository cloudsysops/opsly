import { jsonError } from '@/lib/api-response';
import { requireAdminAccess } from '../../../../../lib/auth';
import { HTTP_STATUS } from '@intcloudsysops/constants';
import { logger } from '../../../../../lib/logger';
import {
  META_PAGE_MESSAGE_MAX_LENGTH,
  isMetaPageFeedConfigured,
  publishMetaPageFeedPost,
  resolveMetaGraphApiVersion,
} from '../../../../../lib/meta-page-feed';

function parsePostBody(raw: unknown): { message: string; dry_run: boolean } | null {
  if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  const o = raw as Record<string, unknown>;
  const message = typeof o.message === 'string' ? o.message.trim() : '';
  const dry_run = o.dry_run === true;
  if (message.length === 0) {
    return null;
  }
  if (message.length > META_PAGE_MESSAGE_MAX_LENGTH) {
    return null;
  }
  return { message, dry_run };
}

/**
 * POST — publicar texto en el feed orgánico de la Facebook Page (Meta Graph API).
 * Admin only. Cuerpo: { "message": string, "dry_run"?: boolean }
 *
 * @see docs/adr/ADR-043-facebook-page-organic-publishing-graph-api.md
 */
export async function POST(request: Request): Promise<Response> {
  const auth = await requireAdminAccess(request);
  if (auth !== null) {
    return auth;
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError('Invalid JSON', HTTP_STATUS.BAD_REQUEST);
  }

  const parsed = parsePostBody(raw);
  if (parsed === null) {
    return jsonError(
      `message required (non-empty string, max ${String(META_PAGE_MESSAGE_MAX_LENGTH)} chars)`,
      HTTP_STATUS.BAD_REQUEST
    );
  }

  if (!parsed.dry_run && !isMetaPageFeedConfigured()) {
    return jsonError(
      'Facebook Page publishing not configured (META_PAGE_ID, META_PAGE_ACCESS_TOKEN)',
      HTTP_STATUS.SERVICE_UNAVAILABLE
    );
  }

  const result = await publishMetaPageFeedPost({
    message: parsed.message,
    dryRun: parsed.dry_run,
  });

  if (!result.ok) {
    logger.warn('meta_page_feed publish failed', {
      status: result.status,
      error: result.error,
    });
    return jsonError(result.error, result.status);
  }

  logger.info('meta_page_feed publish ok', {
    dry_run: result.dry_run,
    post_id_len: result.post_id.length,
  });

  return Response.json({
    ok: true,
    dry_run: result.dry_run,
    post_id: result.post_id.length > 0 ? result.post_id : undefined,
    graph_version: resolveMetaGraphApiVersion(),
  });
}

/**
 * GET — estado de configuración (sin secretos). Admin only.
 */
export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdminAccess(request);
  if (auth !== null) {
    return auth;
  }

  return Response.json({
    ok: true,
    configured: isMetaPageFeedConfigured(),
    graph_version: resolveMetaGraphApiVersion(),
  });
}
