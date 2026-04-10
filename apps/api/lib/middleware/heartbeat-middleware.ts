import type { NextFetchEvent, NextRequest } from "next/server";

const HEARTBEAT_HEADER = "x-opsly-heartbeat-internal";

function shouldSkipHeartbeat(pathname: string): boolean {
  return pathname.startsWith("/api/infra/heartbeat");
}

export function enqueueApiHeartbeat(
  request: NextRequest,
  event: NextFetchEvent,
): void {
  if (shouldSkipHeartbeat(request.nextUrl.pathname)) {
    return;
  }
  const url = new URL("/api/infra/heartbeat", request.nextUrl.origin);
  url.searchParams.set("path", request.nextUrl.pathname);

  event.waitUntil(
    fetch(url.toString(), {
      method: "POST",
      headers: {
        [HEARTBEAT_HEADER]: "1",
      },
      cache: "no-store",
      keepalive: true,
    }).catch(() => undefined),
  );
}

export function isInternalHeartbeat(request: Request): boolean {
  return request.headers.get(HEARTBEAT_HEADER) === "1";
}
