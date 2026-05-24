import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import { isAdminPublicDemoEnabled } from '@/lib/admin-public-demo';

function redirectToLogin(request: NextRequest): NextResponse {
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = '/login';
  redirectUrl.search = '';
  return NextResponse.redirect(redirectUrl);
}

export async function updateSession(request: NextRequest): Promise<NextResponse> {
  if (isAdminPublicDemoEnabled()) {
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    const pathname = request.nextUrl.pathname;
    const isLogin = pathname === '/login' || pathname.startsWith('/login/');
    const isInvite = pathname.startsWith('/invite/');
    const isAuthPublic =
      pathname.startsWith('/auth/') || pathname === '/update-password';
    if (!isLogin && !isInvite && !isAuthPublic) {
      return redirectToLogin(request);
    }
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
  const isLogin = pathname === '/login' || pathname.startsWith('/login/');
  const isInvite = pathname.startsWith('/invite/');
  const isAuthPublic =
    pathname.startsWith('/auth/') || pathname === '/update-password';
  if (!user && !isLogin && !isInvite && !isAuthPublic) {
    return redirectToLogin(request);
  }

  // Keep /login reachable when a session cookie exists: recovery tokens are in the hash only.

  return supabaseResponse;
}
