import { type NextRequest, NextResponse } from "next/server";
import { pickCorsOrigin } from "./lib/cors-origins";

const CORS_METHODS = "GET,POST,PATCH,DELETE,OPTIONS";
const CORS_HEADERS = "Content-Type,Authorization,x-admin-token";
const API_VERSION = "1";

// Security headers
const SECURITY_HEADERS = {
  // Content Security Policy
  // - 'self' for same-origin resources
  // - 'unsafe-inline' for Next.js (required for inline styles/scripts)
  // - Supabase and Stripe domains for API connections
  // - Default-src 'none' to block everything else by default
  "Content-Security-Policy":
    "default-src 'none'; " +
    "script-src 'self' 'unsafe-inline' https://*.supabase.co https://js.stripe.com; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https://*.supabase.co; " +
    "connect-src 'self' https://*.supabase.co https://api.stripe.com; " +
    "font-src 'self'; " +
    "object-src 'none'; " +
    "base-uri 'self'; " +
    "frame-ancestors 'none';",

  // Prevent clickjacking
  "X-Frame-Options": "DENY",

  // Prevent MIME type sniffing
  "X-Content-Type-Options": "nosniff",

  // Referrer policy
  "Referrer-Policy": "strict-origin-when-cross-origin",

  // Additional security headers
  "X-DNS-Prefetch-Control": "on",
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Permitted-Cross-Domain-Policies": "none",
  "X-Download-Options": "noopen",
};

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
  
  // Skip API routes that don't start with /api
  if (!pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // Rewrite /api/v1/* → /api/*
  const rewritten = rewriteV1(request);
  if (rewritten) {
    rewritten.headers.set("X-API-Version", API_VERSION);
    // Apply security headers to rewritten response
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      rewritten.headers.set(key, value);
    });
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

  // Apply security headers to all API responses
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    res.headers.set(key, value);
  });

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