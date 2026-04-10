import { randomBytes } from "node:crypto";
import { z } from "zod";
import { jsonError, parseJsonBody, tryRoute } from "../../../../../lib/api-response";
import { requireAdminToken } from "../../../../../lib/auth";
import { HTTP_STATUS, WEBHOOK_CRYPTO } from "../../../../../lib/constants";
import {
  createWebhook,
  listWebhooks,
} from "../../../../../lib/repositories/webhook-repository";

const ALLOWED_EVENTS = [
  "tenant.created",
  "tenant.suspended",
  "tenant.resumed",
  "billing.paid",
  "billing.failed",
  "backup.completed",
  "backup.failed",
  "usage.threshold_reached",
] as const;

const CreateWebhookSchema = z.object({
  url: z.string().url(),
  events: z.array(z.enum(ALLOWED_EVENTS)).min(1),
});

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteParams): Promise<Response> {
  return tryRoute("GET /api/tenants/[id]/webhooks", async () => {
    const authErr = requireAdminToken(_req);
    if (authErr) return authErr;

    const { id: tenantSlug } = await params;
    const webhooks = await listWebhooks(tenantSlug);
    const safe = webhooks.map((w) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { secret: _secret, ...rest } = w;
      return rest;
    });
    return Response.json(safe);
  });
}

export async function POST(req: Request, { params }: RouteParams): Promise<Response> {
  return tryRoute("POST /api/tenants/[id]/webhooks", async () => {
    const authErr = requireAdminToken(req);
    if (authErr) return authErr;

    const body = await parseJsonBody(req);
    const parsed = CreateWebhookSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(parsed.error.message, HTTP_STATUS.UNPROCESSABLE);
    }

    const { id: tenantSlug } = await params;
    const secret = randomBytes(WEBHOOK_CRYPTO.SECRET_RANDOM_BYTES).toString("hex");

    const webhook = await createWebhook({
      tenant_slug: tenantSlug,
      url: parsed.data.url,
      secret,
      events: parsed.data.events as string[],
    });

    // Devolver el secret solo en la creación (no se vuelve a mostrar)
    return Response.json(webhook, { status: HTTP_STATUS.CREATED });
  });
}

export const runtime = "nodejs";
