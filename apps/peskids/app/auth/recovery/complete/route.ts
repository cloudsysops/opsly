import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveRecoveryRedirectUrl } from '@/lib/auth-recovery';
import { recoveryExchangeErrorMessage } from '@/lib/auth-recovery-messages';
import {
  getPeskidsPublicBaseUrl,
  isLocalhostLikeOrigin,
  isProductionRuntime,
} from '@/lib/app-url';
import { normalizeRequestOrigin } from '@/lib/request-origin';

function metadataFromUser(user: {
  user_metadata?: unknown;
  app_metadata?: unknown;
}): Record<string, unknown> {
  const userMeta =
    user.user_metadata && typeof user.user_metadata === 'object' && !Array.isArray(user.user_metadata)
      ? (user.user_metadata as Record<string, unknown>)
      : {};
  const appMeta =
    user.app_metadata && typeof user.app_metadata === 'object' && !Array.isArray(user.app_metadata)
      ? (user.app_metadata as Record<string, unknown>)
      : {};

  return {
    ...appMeta,
    ...userMeta,
  };
}

function resolveCallbackOrigin(requestOrigin: string): string {
  const normalized = normalizeRequestOrigin(requestOrigin);
  if (isProductionRuntime() && isLocalhostLikeOrigin(normalized)) {
    return getPeskidsPublicBaseUrl();
  }
  return normalized;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = resolveCallbackOrigin(requestUrl.origin);
  const loginUrl = new URL('/admin/login', origin);

  if (!code) {
    return NextResponse.redirect(loginUrl);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    const message = recoveryExchangeErrorMessage(error.message);
    console.error('Recovery callback error:', message);
    loginUrl.searchParams.set('error', message);
    return NextResponse.redirect(loginUrl);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    loginUrl.searchParams.set('error', 'No se pudo validar el enlace de recuperación.');
    return NextResponse.redirect(loginUrl);
  }

  const updatePath = new URL(resolveRecoveryRedirectUrl(metadataFromUser(user))).pathname;
  return NextResponse.redirect(new URL(updatePath, origin));
}
