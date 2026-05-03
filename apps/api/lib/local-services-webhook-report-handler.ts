import { HTTP_STATUS } from './constants';
import type { LocalServicesWebhookHandlerResult } from './local-services-webhook-handler';
import { lsWebhookReportCreateBodySchema } from './local-services-webhook-schema';
import { lsInsertReportForTenantSlug } from './repositories/local-services-repository';

export async function handleLocalServicesWebhookReportCreate(
  slug: string,
  body: unknown
): Promise<LocalServicesWebhookHandlerResult> {
  const parsed = lsWebhookReportCreateBodySchema.safeParse(body);
  if (!parsed.success) {
    return {
      ok: false,
      response: Response.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: HTTP_STATUS.BAD_REQUEST }
      ),
    };
  }

  const inserted = await lsInsertReportForTenantSlug({
    tenantSlug: slug,
    title: parsed.data.title,
    body: parsed.data.body ?? {},
  });
  if (!inserted.ok) {
    return {
      ok: false,
      response: Response.json({ error: 'Insert failed' }, { status: HTTP_STATUS.INTERNAL_ERROR }),
    };
  }

  return {
    ok: true,
    response: Response.json({
      ok: true,
      tenant_slug: slug,
      report_id: inserted.id,
    }),
  };
}
