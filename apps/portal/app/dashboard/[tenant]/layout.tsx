import type { ReactElement, ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { tenantSlugFromUserMetadata } from '@/lib/tenant';
import { isPortalDemoSession, portalDemoTenantMatches } from '@/lib/demo-session';

const TENANT_LAYOUT_AUTH_TIMEOUT_MS = 2_000;

async function withAuthTimeout<T>(promise: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('portal tenant auth timeout')),
          TENANT_LAYOUT_AUTH_TIMEOUT_MS
        );
      }),
    ]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenant: string }>;
}): Promise<ReactElement> {
  const { tenant } = await params;
  if (await isPortalDemoSession()) {
    if (!portalDemoTenantMatches(tenant)) {
      redirect('/dashboard');
    }
    return <>{children}</>;
  }
  const supabase = await createServerSupabase();
  let user;
  try {
    const result = await withAuthTimeout(supabase.auth.getUser());
    user = result.data.user;
  } catch {
    redirect('/login');
  }

  if (!user) {
    redirect('/login');
  }

  const sessionSlug = tenantSlugFromUserMetadata(user);

  // Verify URL slug matches session tenant
  if (!sessionSlug || sessionSlug !== tenant) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}
