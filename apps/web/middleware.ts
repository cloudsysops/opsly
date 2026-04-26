import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';

function json401(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function isPublicApiPath(pathname: string): boolean {
  if (pathname === '/api/health' || pathname.startsWith('/api/health/')) {
    return true;
  }
  if (pathname === '/api/webhooks/stripe' || pathname.startsWith('/api/webhooks/stripe/')) {
    return true;
  }
  if (pathname.startsWith('/api/public/')) {
    return true;
  }
  return false;
}

function isPlatformAdminUser(user: User): boolean {
  const app = user.app_metadata as Record<string, unknown> | undefined;
  if (app?.platform_admin === true) {
    return true;
  }
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  return meta?.platform_admin === true;
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    let url: string;
    let anonKey: string;
    try {
      url = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
      anonKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    } catch {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    let response = NextResponse.next({ request });

    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(
            ({ name, value, options }: { name: string; value: string; options: CookieOptions }) => {
              response.cookies.set(name, value, options);
            }
          );
        },
      },
    });

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user || !isPlatformAdminUser(user)) {
      return json401();
    }

    return response;
  }

  if (pathname.startsWith('/api')) {
    if (isPublicApiPath(pathname)) {
      return NextResponse.next({ request });
    }

    const adminToken = process.env.PLATFORM_ADMIN_TOKEN;
    if (!adminToken) {
      return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
    }

    const authHeader = request.headers.get('authorization');
    const bearer =
      authHeader?.startsWith('Bearer ') === true ? authHeader.slice('Bearer '.length).trim() : null;

    if (!bearer || bearer !== adminToken) {
      return json401();
    }

    return NextResponse.next({ request });
  }

  return NextResponse.next({ request });
}

export const config = {
  matcher: ['/admin/:path*', '/api/:path*'],
};
