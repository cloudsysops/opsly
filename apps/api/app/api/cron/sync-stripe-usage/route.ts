import { NextResponse } from "next/server";
import { syncAllTenantsUsage } from "../../../../lib/stripe/usage-sync";
import { HTTP_STATUS } from "../../../../lib/constants";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return false;
  }
  const auth = request.headers.get("authorization");
  const bearer =
    auth !== null && auth.startsWith("Bearer ")
      ? auth.slice("Bearer ".length).trim()
      : null;
  const header = request.headers.get("x-cron-secret");
  const token = bearer ?? header ?? "";
  return token === secret;
}

/**
 * Cron endpoint: sincroniza consumo de tokens IA con Stripe Usage Records.
 * Programar diariamente. Auth: `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: HTTP_STATUS.UNAUTHORIZED },
    );
  }
  const result = await syncAllTenantsUsage();
  return NextResponse.json(result);
}

export async function POST(request: Request): Promise<Response> {
  return GET(request);
}
