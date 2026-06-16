import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { appendRecoveryCallbackParam } from '@/lib/password-recovery-session';

function getSupabaseConfig(): { url: string; anon: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
  if (!url || !anon) {
    return null;
  }
  return { url, anon };
}

function sanitizeNextPath(next: string | null): string | null {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return null;
  }
  return next;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const requestUrl = request.nextUrl;
  const code = requestUrl.searchParams.get('code');
  const nextPath = sanitizeNextPath(requestUrl.searchParams.get('next'));

  const errorRedirect = (message: string): NextResponse => {
    const errorUrl = new URL('/login', requestUrl.origin);
    errorUrl.searchParams.set('error', message);
    return NextResponse.redirect(errorUrl);
  };

  if (!code) {
    return errorRedirect('Enlace de acceso inválido o incompleto.');
  }

  const config = getSupabaseConfig();
  if (!config) {
    return errorRedirect('Configuración de autenticación incompleta.');
  }

  const redirectPath =
    nextPath === '/auth/recovery'
      ? appendRecoveryCallbackParam('/auth/recovery')
      : (nextPath ?? '/dashboard');

  const response = NextResponse.redirect(new URL(redirectPath, requestUrl.origin));

  const supabase = createServerClient(config.url, config.anon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return errorRedirect(error.message);
  }

  return response;
}
