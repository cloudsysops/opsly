import { jsonError } from './api-response';
import { HTTP_STATUS } from './constants';
import { resolveSuperAdminSession } from './super-admin-auth';

export function isPublicDemoRead(): boolean {
  return process.env.ADMIN_PUBLIC_DEMO_READ === 'true';
}

function readAdminTokenFromRequest(request: Request): string {
  const auth = request.headers.get('authorization');
  const bearer =
    auth?.startsWith('Bearer ') === true
      ? auth.slice('Bearer '.length).trim()
      : '';
  const headerToken = request.headers.get('x-admin-token')?.trim() ?? '';
  return bearer.length > 0 ? bearer : headerToken;
}

function readExpectedAdminToken(): string {
  return process.env.PLATFORM_ADMIN_TOKEN?.trim() ?? '';
}

/**
 * GET publico solo cuando ADMIN_PUBLIC_DEMO_READ=true (demo familia).
 * Mutaciones siguen usando requireAdminToken.
 */
export function requireAdminTokenUnlessDemoRead(
  request: Request,
): Response | null {
  if (request.method === 'GET' && isPublicDemoRead()) {
    return null;
  }
  return requireAdminToken(request);
}

/**
 * Acepta token administrativo legado o sesion Supabase de super admin.
 * Se usa en rutas consumidas por el panel admin para evitar exponer tokens
 * publicos en el navegador.
 */
export async function requireAdminAccess(
  request: Request,
): Promise<Response | null> {
  const expected = readExpectedAdminToken();
  const token = readAdminTokenFromRequest(request);
  if (expected.length > 0 && token.length > 0 && token === expected) {
    return null;
  }

  const auth = await resolveSuperAdminSession(request);
  if (auth.ok) {
    return null;
  }
  return auth.response;
}

export async function requireAdminAccessUnlessDemoRead(
  request: Request,
): Promise<Response | null> {
  if (request.method === 'GET' && isPublicDemoRead()) {
    return null;
  }
  return requireAdminAccess(request);
}

export function requireAdminToken(request: Request): Response | null {
  const expected = readExpectedAdminToken();
  if (expected.length === 0) {
    return jsonError(
      'Server misconfiguration: PLATFORM_ADMIN_TOKEN is not set',
      HTTP_STATUS.INTERNAL_ERROR,
    );
  }

  const token = readAdminTokenFromRequest(request);

  if (token.length === 0 || token !== expected) {
    return jsonError('Unauthorized', HTTP_STATUS.UNAUTHORIZED);
  }

  return null;
}
