import { type NextRequest, NextResponse } from "next/server";
import { pickCorsOrigin } from "./lib/cors-origins";

const CORS_METHODS = "GET,POST,PATCH,DELETE,OPTIONS";
const CORS_HEADERS = "Content-Type,Authorization,x-admin-token";

function corsHeaders(origin: string): Headers {
  const h = new Headers();
  h.set("Access-Control-Allow-Origin", origin);
  h.set("Access-Control-Allow-Methods", CORS_METHODS);
  h.set("Access-Control-Allow-Headers", CORS_HEADERS);
  h.set("Vary", "Origin");
  return h;
}

export function middleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const origin = pickCorsOrigin(request.headers.get("origin"));

  if (request.method === "OPTIONS") {
    if (!origin) {
      return new NextResponse(null, { status: 204 });
    }
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  if (!origin) {
    return NextResponse.next();
  }

  const res = NextResponse.next();
  const ch = corsHeaders(origin);
  ch.forEach((value, key) => {
    res.headers.set(key, value);
  });
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
