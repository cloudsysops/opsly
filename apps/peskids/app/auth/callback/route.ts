import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { resolveLoginPath, resolvePostAuthPath } from '@/lib/auth-callback';
import { appendRecoveryCallbackParam } from '@/lib/password-recovery-session';

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next');
  const nextPath =
    next && next.startsWith('/') && !next.startsWith('//') ? next : null;
  const errorLoginPath = resolveLoginPath(nextPath ?? '/admin');

  if (!code) {
    return NextResponse.redirect(new URL(errorLoginPath, requestUrl.origin));
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
    console.error('Auth callback error:', error.message);
    return NextResponse.redirect(new URL(errorLoginPath, requestUrl.origin));
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let redirectPath = user ? resolvePostAuthPath(nextPath, user) : errorLoginPath;
  if (user && nextPath === '/auth/recovery') {
    redirectPath = appendRecoveryCallbackParam('/auth/recovery');
  }
  return NextResponse.redirect(new URL(redirectPath, requestUrl.origin));
}
