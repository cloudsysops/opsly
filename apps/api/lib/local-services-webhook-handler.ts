import { HTTP_STATUS } from './constants';
import { logger } from './logger';
import { assertLocalServicesTenantPublic } from './local-services-public';
import {
  resolveLocalServicesWebhookSecret,
  verifyLocalServicesWebhookSignature,
} from './local-services-webhook-signature';

export type LocalServicesWebhookHandlerResult =
  | { ok: true; response: Response }
  | { ok: false; response: Response };

/**
 * Shared POST pipeline: tenant gate → HMAC body → JSON parse → handler.
 * Caller supplies `handleBody` after Zod validation inside the route or here via pre-parsed.
 */
export async function runLocalServicesWebhookPost(params: {
  request: Request;
  slug: string;
  handleValidatedJson: (body: unknown) => Promise<LocalServicesWebhookHandlerResult>;
}): Promise<Response> {
  const gate = await assertLocalServicesTenantPublic(params.slug);
  if (gate !== null) {
    return gate;
  }

  const secret = resolveLocalServicesWebhookSecret(params.slug);
  if (secret === '') {
    logger.warn('local_services_webhook: secret not configured', { tenant_slug: params.slug });
    return Response.json(
      { error: 'Webhook not configured for tenant' },
      { status: HTTP_STATUS.UNAUTHORIZED }
    );
  }

  let rawBody: string;
  try {
    rawBody = await params.request.text();
  } catch {
    return Response.json({ error: 'Invalid body' }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  const sig =
    params.request.headers.get('x-opsly-signature') ??
    params.request.headers.get('X-Opsly-Signature');
  if (!verifyLocalServicesWebhookSignature({ rawBody, signatureHeader: sig, secret })) {
    return Response.json({ error: 'Invalid signature' }, { status: HTTP_STATUS.UNAUTHORIZED });
  }

  let parsed: unknown;
  try {
    parsed = rawBody === '' ? {} : (JSON.parse(rawBody) as unknown);
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: HTTP_STATUS.BAD_REQUEST });
  }

  const out = await params.handleValidatedJson(parsed);
  return out.response;
}
