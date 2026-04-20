import {
  jsonError,
  parseJsonBody,
  serverErrorLogged,
  tryRoute,
} from '../../../../../lib/api-response';
import { HTTP_STATUS } from '../../../../../lib/constants';
import type { InvoiceStatus } from '../../../../../lib/billing/invoice-types';
import { UpdateInvoiceStatusSchema } from '../../../../../lib/billing/invoice-types';
import { getInvoiceById, updateInvoiceStatus } from '../../../../../lib/billing/invoice-service';
import { resolveTrustedPortalSession } from '../../../../../lib/portal-trusted-identity';
import { requireAdminAccess } from '../../../../../lib/auth';
import { getServiceClient } from '../../../../../lib/supabase';

type RouteContext = { params: Promise<{ id: string }> };

async function resolveTenantIdForInvoice(invoiceId: string): Promise<string | null> {
  const { data } = await getServiceClient()
    .schema('platform')
    .from('invoices')
    .select('tenant_id')
    .eq('id', invoiceId)
    .maybeSingle();
  return (data?.tenant_id as string) ?? null;
}

function statusUpdateResponse(updated: Awaited<ReturnType<typeof updateInvoiceStatus>>): Response {
  return updated ? Response.json(updated) : jsonError('Invoice not found', HTTP_STATUS.NOT_FOUND);
}

/**
 * GET /api/billing/invoices/[id]
 */
export function GET(request: Request, context: RouteContext): Promise<Response> {
  return tryRoute('GET /api/billing/invoices/:id', async () => {
    const { id } = await context.params;

    const adminAuth = await requireAdminAccess(request);
    if (!adminAuth) {
      const tenantId = await resolveTenantIdForInvoice(id);
      if (!tenantId) return jsonError('Invoice not found', HTTP_STATUS.NOT_FOUND);
      const full = await getInvoiceById(tenantId, id);
      return Response.json(full);
    }

    const session = await resolveTrustedPortalSession(request);
    if (!session.ok) return session.response;

    const invoice = await getInvoiceById(session.session.tenant.id, id);
    if (!invoice) return jsonError('Invoice not found', HTTP_STATUS.NOT_FOUND);
    return Response.json(invoice);
  });
}

/**
 * PATCH /api/billing/invoices/[id]
 */
export function PATCH(request: Request, context: RouteContext): Promise<Response> {
  return tryRoute('PATCH /api/billing/invoices/:id', async () => {
    const { id } = await context.params;

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.ok) return parsedBody.response;

    const parsed = UpdateInvoiceStatusSchema.safeParse(parsedBody.body);
    if (!parsed.success) {
      return jsonError(parsed.error.issues[0]?.message ?? 'Invalid body', HTTP_STATUS.BAD_REQUEST);
    }

    const newStatus = parsed.data.status as InvoiceStatus;

    const adminAuth = await requireAdminAccess(request);
    if (!adminAuth) {
      const tenantId = await resolveTenantIdForInvoice(id);
      if (!tenantId) return jsonError('Invoice not found', HTTP_STATUS.NOT_FOUND);
      return statusUpdateResponse(await updateInvoiceStatus(tenantId, id, newStatus));
    }

    const session = await resolveTrustedPortalSession(request);
    if (!session.ok) return session.response;

    try {
      return statusUpdateResponse(
        await updateInvoiceStatus(session.session.tenant.id, id, newStatus)
      );
    } catch (err) {
      return serverErrorLogged('PATCH /api/billing/invoices/:id', err);
    }
  });
}
