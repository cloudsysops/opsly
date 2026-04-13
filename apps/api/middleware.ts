// Middleware en la raíz del paquete (`apps/api/middleware.ts`). No existe `apps/api/src/middleware.ts` en este repo.
import { NextResponse, type NextRequest } from 'next/server';
import { pickCorsOrigin } from './lib/cors-origins';
import { HTTP_STATUS } from './lib/constants';
import { checkRateLimit, RATE_LIMIT_MAX_REQUESTS, type RateLimitResult } from './lib/rate-limiter';

const CORS_METHODS = 'GET,POST,PATCH,DELETE,OPTIONS';
const CORS_HEADERS = 'Content-Type,Authorization,x-admin-token';
const API_VERSION = '1';
const BASE64_BLOCK_SIZE = 4;
const PORTAL_HEALTH_PATH = '/api/portal/health';
const TENANT_PATH_MARKER = 'tenant';

// Security headers (CSP + hardening) — todas las respuestas `/api/*`
const SECURITY_HEADERS: Record<string, string> = {
  'Content-Security-Policy':
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://*.supabase.co https://api.stripe.com; " +
    "font-src 'self' data:; " +
    "frame-ancestors 'none';",

  'X-Frame-Options': 'DENY',

  'X-Content-Type-Options': 'nosniff',

  'Referrer-Policy': 'strict-origin-when-cross-origin',

  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function normalizedApiPath(pathname: string): string {
  if (pathname.startsWith('/api/v1/')) {
    return pathname.replace('/api/v1/', '/api/');
  }
  return pathname;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readTenantSlug(source: unknown): string | null {
  if (!isRecord(source)) {
    return null;
  }
  const value = source.tenant_slug;
  if (typeof value !== 'string') {
    return null;
  }
  const slug = value.trim();
  return slug.length > 0 ? slug : null;
}

function decodeJwtPayload(jwt: string): unknown | null {
  const payload = jwt.split('.')[1];
  if (!payload || payload.length === 0) {
    return null;
  }

  try {
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      Math.ceil(normalized.length / BASE64_BLOCK_SIZE) * BASE64_BLOCK_SIZE,
      '='
    );
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function readPayloadTenantSlug(
  payload: unknown,
  key: 'user_metadata' | 'app_metadata'
): string | null {
  if (!isRecord(payload)) {
    return null;
  }
  return readTenantSlug(payload[key]);
}

function resolveTenantSlugFromAuth(request: NextRequest): string | null {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) {
    return null;
  }

  const jwt = auth.slice('Bearer '.length).trim();
  if (jwt.length === 0) {
    return null;
  }

  const payload = decodeJwtPayload(jwt);
  return (
    readTenantSlug(payload) ??
    readPayloadTenantSlug(payload, 'user_metadata') ??
    readPayloadTenantSlug(payload, 'app_metadata')
  );
}

function resolveTenantSlugFromPath(pathname: string): string | null {
  const segments = pathname.split('/').filter(Boolean);
  const [apiSegment, resourceSegment, tenantMarker, slugSegment] = segments;

  if (apiSegment !== 'api' || tenantMarker !== TENANT_PATH_MARKER) {
    return null;
  }

  const isTenantScopedResource = resourceSegment === 'portal' || resourceSegment === 'metrics';

  return isTenantScopedResource ? slugSegment?.trim() || null : null;
}

function resolveTenantSlug(request: NextRequest): string | null {
  const headerSlug = request.headers.get('x-tenant-slug')?.trim();
  if (headerSlug && headerSlug.length > 0) {
    return headerSlug;
  }

  const pathname = normalizedApiPath(request.nextUrl.pathname);
  const slugFromQuery = request.nextUrl.searchParams.get('slug')?.trim();

  if (pathname === PORTAL_HEALTH_PATH && slugFromQuery && slugFromQuery.length > 0) {
    return slugFromQuery;
  }

  const slugFromPath = resolveTenantSlugFromPath(pathname);
  if (slugFromPath) {
    return slugFromPath;
  }

  return resolveTenantSlugFromAuth(request);
}

function applyRateLimitHeaders(response: NextResponse, result: RateLimitResult): void {
  const resetSeconds = Math.max(0, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000));

  response.headers.set('X-RateLimit-Limit', String(RATE_LIMIT_MAX_REQUESTS));
  response.headers.set('X-RateLimit-Remaining', String(result.remaining));
  response.headers.set('X-RateLimit-Reset', String(Math.floor(result.resetAt.getTime() / 1000)));

  if (!result.allowed) {
    response.headers.set('Retry-After', String(resetSeconds));
  }
}

function applyApiHeaders(
  response: NextResponse,
  origin: string | null,
  rateLimitResult: RateLimitResult | null
): NextResponse {
  response.headers.set('X-API-Version', API_VERSION);

  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
    response.headers.set(key, value);
  });

  if (origin) {
    const ch = corsHeaders(origin);
    ch.forEach((value, key) => {
      response.headers.set(key, value);
    });
  }

  if (rateLimitResult) {
    applyRateLimitHeaders(response, rateLimitResult);
  }

  return response;
}

function corsHeaders(origin: string): Headers {
  const h = new Headers();
  h.set('Access-Control-Allow-Origin', origin);
  h.set('Access-Control-Allow-Methods', CORS_METHODS);
  h.set('Access-Control-Allow-Headers', CORS_HEADERS);
  h.set('Vary', 'Origin');
  return h;
}

// Reescribe /api/v1/* → /api/* para compatibilidad hacia atrás
function rewriteV1(request: NextRequest): NextResponse | null {
  const { pathname } = request.nextUrl;
  if (!pathname.startsWith('/api/v1/')) return null;
  const newPath = pathname.replace('/api/v1/', '/api/');
  const url = request.nextUrl.clone();
  url.pathname = newPath;
  return NextResponse.rewrite(url);
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const pathname = request.nextUrl.pathname;

  // Skip API routes that don't start with /api
  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Rewrite /api/v1/* → /api/*
  const rewritten = rewriteV1(request);

  const origin = pickCorsOrigin(request.headers.get('origin'));

  if (request.method === 'OPTIONS') {
    if (!origin) {
      return new NextResponse(null, { status: 204 });
    }
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  const tenantSlug = resolveTenantSlug(request);
  const rateLimitResult = tenantSlug ? await checkRateLimit(tenantSlug) : null;

  if (rateLimitResult && !rateLimitResult.allowed) {
    return applyApiHeaders(
      NextResponse.json(
        {
          error: 'Too many requests',
          tenant: tenantSlug,
        },
        { status: HTTP_STATUS.TOO_MANY_REQUESTS }
      ),
      origin,
      rateLimitResult
    );
  }

  if (rewritten) {
    return applyApiHeaders(rewritten, origin, rateLimitResult);
  }

  return applyApiHeaders(NextResponse.next(), origin, rateLimitResult);
}

export const config = {
  matcher: '/api/:path*',
};
