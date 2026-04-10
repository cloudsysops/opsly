import { NextResponse } from "next/server";

import { recordHeartbeat } from "../../../../lib/infra/heartbeat";
import { isInternalHeartbeat } from "../../../../lib/middleware/heartbeat-middleware";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  if (!isInternalHeartbeat(request)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const url = new URL(request.url);
  const path = url.searchParams.get("path") ?? "unknown";
  await recordHeartbeat("api", { path });
  return new NextResponse(null, { status: 204 });
}
