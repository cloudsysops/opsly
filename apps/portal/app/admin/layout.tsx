import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { createServerSupabase } from '@/lib/supabase/server';
import { isSuperAdminUser } from '@/lib/super-admin';

export default async function AdminSectionLayout({
  children,
}: {
  children: ReactNode;
}): Promise<ReactNode> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login');
  }
  if (!isSuperAdminUser(user)) {
    redirect('/dashboard');
  }
  return children;
}
