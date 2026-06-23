import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import {
  resolveLoginPath,
  resolvePostAuthPath,
  resolveRecoveryUpdatePath,
} from '@/lib/auth-callback';
import { recoveryExchangeErrorMessage } from '@/lib/auth-recovery-messages';
import { normalizeRequestOrigin } from '@/lib/request-origin';

function getSupabaseConfig(): { url: string; anon: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
  if (!url || !anon) {
    return null;
  }
  return { url, anon };
}

function redirectWithError(
  requestUrl: URL,
  loginPath: string,
  message: string
): NextResponse {
  const origin = normalizeRequestOrigin(requestUrl.origin);
  const loginWithError = new URL(loginPath, origin);
  loginWithError.searchParams.set('error', message);
  return NextResponse.redirect(loginWithError);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = request.nextUrl;
  const code = requestUrl.searchParams.get('code');
  const tokenHash = requestUrl.searchParams.get('token_hash');
  const otpType = requestUrl.searchParams.get('type');
  const next = requestUrl.searchParams.get('next');
  const nextPath = next && next.startsWith('/') ? next : null;
  const errorLoginPath = resolveLoginPath(nextPath ?? '/admin');
  const origin = normalizeRequestOrigin(requestUrl.origin);

  const config = getSupabaseConfig();
  if (!config) {
    return redirectWithError(requestUrl, errorLoginPath, 'auth_not_configured');
  }

  let pendingCookies: Parameters<SetAllCookies>[0] = [];
  const supabase = createServerClient(config.url, config.anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        pendingCookies = cookiesToSet;
      },
    },
  });

  if (tokenHash && otpType === 'recovery') {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: 'recovery',
    });
    if (error) {
      const message = recoveryExchangeErrorMessage(error.message);
      console.error('Auth callback verifyOtp error:', message);
      return redirectWithError(requestUrl, errorLoginPath, message);
    }
    if (!data.user) {
      return redirectWithError(requestUrl, errorLoginPath, 'missing_user');
    }

    const redirectPath = nextPath?.includes('update-password')
      ? resolveRecoveryUpdatePath(data.user, nextPath)
      : resolvePostAuthPath(nextPath, data.user);
    const response = NextResponse.redirect(new URL(redirectPath, origin));
    pendingCookies.forEach(({ name, value, options }) => {
      response.cookies.set(name, value, options);
    });
    return response;
  }

  if (!code) {
    return NextResponse.redirect(new URL(errorLoginPath, origin));
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const message = recoveryExchangeErrorMessage(error.message);
    console.error('Auth callback error:', message);
    return redirectWithError(requestUrl, errorLoginPath, message);
  }
  if (!data.user) {
    return redirectWithError(requestUrl, errorLoginPath, 'missing_user');
  }

  const redirectPath = nextPath?.includes('update-password')
    ? resolveRecoveryUpdatePath(data.user, nextPath)
    : resolvePostAuthPath(nextPath, data.user);

  const response = NextResponse.redirect(new URL(redirectPath, origin));
  pendingCookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  return response;
}
