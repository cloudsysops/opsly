import { tryRoute } from "../../../../../../lib/api-response";
import { requireAdminToken } from "../../../../../../lib/auth";
import { HTTP_STATUS } from "../../../../../../lib/constants";
import { deleteWebhook } from "../../../../../../lib/repositories/webhook-repository";

type RouteParams = { params: Promise<{ id: string; webhookId: string }> };

export async function DELETE(req: Request, { params }: RouteParams): Promise<Response> {
  return tryRoute("DELETE /api/tenants/[id]/webhooks/[webhookId]", async () => {
    const authErr = requireAdminToken(req);
    if (authErr) return authErr;

    const { id: tenantSlug, webhookId } = await params;
    await deleteWebhook(webhookId, tenantSlug);
    return new Response(null, { status: HTTP_STATUS.NO_CONTENT });
  });
}

export const runtime = "nodejs";
