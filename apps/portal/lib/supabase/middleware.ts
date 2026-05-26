import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { PORTAL_DEMO_COOKIE } from '@/lib/demo-tenant';
import {
  isInviteSurfacePath,
  isLoginSurfacePath,
  isPathUnderAuthSurface,
  isRecoverySurfacePath,
  isUpdatePasswordSurfacePath,
} from '../../../../lib/runtime/src/tenant-auth-surface'

const PORTAL_AUTH_SURFACE = {
  entryPaths: ['/', '/login'],
  loginPaths: ['/login'],
  invitePath: '/invite',
  recoveryPath: '/auth/recovery',
  updatePasswordPaths: ['/update-password'],
  authPrefixes: ['/auth/'],
} as const;

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    return supabaseResponse;
  }

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const isLogin = isLoginSurfacePath(pathname, PORTAL_AUTH_SURFACE);
  const isInvite = isInviteSurfacePath(pathname, PORTAL_AUTH_SURFACE);
  const isOnboarding = pathname.startsWith('/onboarding/');
  const isAuthPublic =
    isPathUnderAuthSurface(pathname, PORTAL_AUTH_SURFACE) ||
    isRecoverySurfacePath(pathname, PORTAL_AUTH_SURFACE) ||
    isUpdatePasswordSurfacePath(pathname, PORTAL_AUTH_SURFACE);
  const isAdmin = pathname.startsWith('/admin');
  const hasDemoSession =
    request.cookies.get(PORTAL_DEMO_COOKIE)?.value === '1' &&
    (request.nextUrl.hostname === 'localhost' || request.nextUrl.hostname === '127.0.0.1');

  if (hasDemoSession && isLogin) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/dashboard';
    return NextResponse.redirect(redirectUrl);
  }

  if (
    !user &&
    !hasDemoSession &&
    !isLogin &&
    !isInvite &&
    !isAuthPublic &&
    (pathname.startsWith('/dashboard') || isOnboarding || isAdmin)
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/login';
    return NextResponse.redirect(redirectUrl);
  }

  // Do not redirect away from /login when a session exists: recovery tokens are in the
  // URL hash (#access_token=...) which never reaches the server. AuthSessionRedirect
  // on / and /login forwards hash callbacks to /auth/recovery client-side.

  return supabaseResponse;
}
