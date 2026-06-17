import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { exchangeAuthCodeOnServer } from '@/lib/auth-server-exchange';
import { resolveLoginPath, resolvePostAuthPath, resolveRecoveryUpdatePath } from '@/lib/auth-callback';
import { recoveryExchangeErrorMessage } from '@/lib/auth-recovery-messages';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');
  const nextPath = next && next.startsWith('/') ? next : null;
  const errorLoginPath = resolveLoginPath(nextPath ?? '/admin');

  if (!code) {
    return NextResponse.redirect(new URL(errorLoginPath, requestUrl.origin));
  }

  const result = await exchangeAuthCodeOnServer(code);
  if (!result.ok) {
    const message =
      'message' in result.error
        ? recoveryExchangeErrorMessage(result.error.message)
        : 'auth_error';
    console.error('Auth callback error:', message);
    const loginWithError = new URL(errorLoginPath, requestUrl.origin);
    loginWithError.searchParams.set('error', message);
    return NextResponse.redirect(loginWithError);
  }

  const redirectPath = nextPath?.includes('update-password')
    ? resolveRecoveryUpdatePath(result.user, nextPath)
    : resolvePostAuthPath(nextPath, result.user);
  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
}
