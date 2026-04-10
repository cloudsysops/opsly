import { type NextRequest, NextResponse } from "next/server";
import { pickCorsOrigin } from "./lib/cors-origins";

const CORS_METHODS = "GET,POST,PATCH,DELETE,OPTIONS";
const CORS_HEADERS = "Content-Type,Authorization,x-admin-token";
const API_VERSION = "1";

function corsHeaders(origin: string): Headers {
  const h = new Headers();
  h.set("Access-Control-Allow-Origin", origin);
  h.set("Access-Control-Allow-Methods", CORS_METHODS);
  h.set("Access-Control-Allow-Headers", CORS_HEADERS);
  h.set("Vary", "Origin");
  return h;
}

// Reescribe /api/v1/* → /api/* para compatibilidad hacia atrás
function rewriteV1(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/api/v1/")) return null;
  const newPath = pathname.replace("/api/v1/", "/api/");
  const url = request.nextUrl.clone();
  url.pathname = newPath;
  return NextResponse.rewrite(url);
}

export function middleware(request: NextRequest): NextResponse {
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Rewrite /api/v1/* → /api/*
  const rewritten = rewriteV1(request);
  if (rewritten) {
    rewritten.headers.set("X-API-Version", API_VERSION);
    return rewritten;
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

  const res = NextResponse.next();
  res.headers.set("X-API-Version", API_VERSION);

  if (!origin) {
    return res;
  }

  const ch = corsHeaders(origin);
  ch.forEach((value, key) => {
    res.headers.set(key, value);
  });
  return res;
}

export const config = {
  matcher: "/api/:path*",
};
