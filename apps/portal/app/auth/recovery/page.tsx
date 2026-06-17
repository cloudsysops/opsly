import { createServerClient, type SetAllCookies } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactElement } from 'react';
import { AuthRecoveryHandler } from '@/components/auth/auth-recovery-handler';

type Props = {
  searchParams: Promise<{ code?: string; next?: string }>;
};

function recoveryErrorMessage(errorMessage: string): string {
  const lower = errorMessage.toLowerCase();
  if (lower.includes('pkce') || lower.includes('code verifier')) {
    return 'El enlace caducó o se abrió en otro navegador. Solicita uno nuevo desde el mismo dispositivo donde pediste la recuperación.';
  }
  return errorMessage;
}

export default async function AuthRecoveryPage({
  searchParams,
}: Props): Promise<ReactElement> {
  const params = await searchParams;
  const code = params.code?.trim();
  const nextParam = params.next?.trim();
  const nextPath =
    nextParam && nextParam.startsWith('/') ? nextParam : '/update-password';

  if (code) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
    if (!url || !anon) {
      redirect('/login?error=auth_not_configured');
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(url, anon, {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    });

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      redirect(`/login?error=${encodeURIComponent(recoveryErrorMessage(error.message))}`);
    }
    redirect(nextPath);
  }

  return (
    <main className="ops-auth-backdrop flex min-h-screen flex-col items-center justify-center px-4">
      <AuthRecoveryHandler updatePasswordPath={nextPath} />
    </main>
  );
}
