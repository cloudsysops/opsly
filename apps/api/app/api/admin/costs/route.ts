import {
  applyCostDecision,
  getAdminCostsPayload,
  parseCostDecisionBody,
} from "../../../../lib/admin-costs";
import { jsonError } from "../../../../lib/api-response";
import { HTTP_STATUS } from "../../../../lib/constants";
import {
  requireAdminAccess,
  requireAdminAccessUnlessDemoRead,
} from "../../../../lib/auth";

async function notifyDiscordCostLine(content: string): Promise<void> {
  const url = process.env.DISCORD_WEBHOOK_URL?.trim();
  if (!url) {
    return;
  }
  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
  } catch {
    /* noop */
  }
}

export async function GET(request: Request): Promise<Response> {
  const auth = await requireAdminAccessUnlessDemoRead(request);
  if (auth !== null) {
    return auth;
  }
  return Response.json(getAdminCostsPayload());
}

export async function POST(request: Request): Promise<Response> {
  const auth = await requireAdminAccess(request);
  if (auth !== null) {
    return auth;
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return jsonError("Invalid JSON", HTTP_STATUS.BAD_REQUEST);
  }

  const body = parseCostDecisionBody(raw);
  if (body === null) {
    return jsonError("service_id and action required", HTTP_STATUS.BAD_REQUEST);
  }

  const result = applyCostDecision(body);
  if (!result.ok) {
    return jsonError(result.error, result.status);
  }

  const payload = getAdminCostsPayload();
  const svc = payload.proposed[body.service_id];
  if (svc) {
    if (body.action === "approve") {
      await notifyDiscordCostLine(
        `✅ **Costos (aprobación registrada)**\n> ${svc.name} — $${svc.cost}/${svc.period}`,
      );
    } else {
      const reason =
        body.reason && body.reason.length > 0 ? ` — ${body.reason}` : "";
      await notifyDiscordCostLine(
        `❌ **Costos (rechazo)**\n> ${svc.name}${reason}`,
      );
    }
  }

  return Response.json({
    success: true,
    proposed: payload.proposed[body.service_id],
    summary: payload.summary,
  });
}
