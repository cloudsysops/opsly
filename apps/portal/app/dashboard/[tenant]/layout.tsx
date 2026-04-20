import type { ReactElement, ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { tenantSlugFromUserMetadata } from '@/lib/tenant';

export default async function TenantLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ tenant: string }>;
}): Promise<ReactElement> {
  const { tenant } = await params;
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();

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
