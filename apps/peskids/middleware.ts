import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { isFamilyUser } from './lib/family-auth';
import {
  isProtectedFamiliasPath,
  isProtectedSupportPath,
  isProtectedTeacherPath,
  loginPathForProtectedPath,
} from './lib/surface-route-guards';
import { isAdminSurfaceUser, isSupportSurfaceUser, isTeacherSurfaceUser } from './lib/staff-user';

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  const needsAuth =
    pathname.startsWith('/admin') ||
    isProtectedTeacherPath(pathname) ||
    isProtectedSupportPath(pathname) ||
    isProtectedFamiliasPath(pathname);

  if (!needsAuth) {
    return NextResponse.next();
  }

  const response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const loginPath = loginPathForProtectedPath(pathname);
  const loginUrl = new URL(loginPath, request.url);
  loginUrl.searchParams.set('next', pathname);

  if (!user) {
    return NextResponse.redirect(loginUrl);
  }

  if (pathname.startsWith('/admin') && !isAdminSurfaceUser(user)) {
    return NextResponse.redirect(loginUrl);
  }

  if (isProtectedTeacherPath(pathname) && !isTeacherSurfaceUser(user)) {
    return NextResponse.redirect(loginUrl);
  }

  if (isProtectedSupportPath(pathname) && !isSupportSurfaceUser(user)) {
    return NextResponse.redirect(loginUrl);
  }

  if (isProtectedFamiliasPath(pathname) && !isFamilyUser(user)) {
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/admin',
    '/admin/:path*',
    '/teacher/:path*',
    '/support/:path*',
    '/familias/submissions',
    '/familias/submissions/:path*',
    '/familias/clases',
    '/familias/clases/:path*',
    '/familias/reservas',
    '/familias/reservas/:path*',
  ],
};
