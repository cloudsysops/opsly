import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { User } from '@supabase/supabase-js';

export function resolveLoginPath(nextPath: string): string {
  if (nextPath.startsWith('/familias')) return '/familias/login';
  if (nextPath.startsWith('/teacher')) return '/teacher/login';
  if (nextPath.startsWith('/support')) return '/support/login';
  return '/admin/login';
}

export function resolvePostAuthPath(next: string | null, user: User): string {
  if (next) return next.startsWith('/') ? next : '/admin';
  const role = (user.user_metadata as Record<string, unknown>)?.role as string | undefined;
  if (role === 'family') return '/familias/submissions';
  if (role === 'teacher') return '/teacher/submissions';
  if (role === 'support') return '/support/dashboard';
  return '/admin';
}

function getSupabaseConfig(): { url: string; anon: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? '';
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? '';
  if (!url || !anon) {
    return null;
  }
  return { url, anon };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const nextPath = request.nextUrl.searchParams.get('next') || '/admin';
  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = nextPath.startsWith('/') ? nextPath : '/admin';
  redirectUrl.search = '';

  const config = getSupabaseConfig();
  if (!config) {
    return NextResponse.redirect(redirectUrl);
  }

  const response = NextResponse.redirect(redirectUrl);
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

  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const errorUrl = request.nextUrl.clone();
      errorUrl.pathname = '/admin/login';
      errorUrl.searchParams.set('error', error.message);
      return NextResponse.redirect(errorUrl);
    }
  }

  return response;
}
