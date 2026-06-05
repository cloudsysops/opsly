/**
 * /familias/verify
 *
 * Server component that handles Supabase magic-link click-through.
 * Supabase action_link already includes the token; this page is the redirectTo target
 * for Supabase's own OTP flow, which means Supabase handles token exchange and sets
 * the auth cookie before the user lands here.
 *
 * Flow:
 *   WhatsApp message → action_link (Supabase) → Supabase OTP exchange → this page
 *   → redirect to /familias/submissions (or ?next= param)
 *
 * If the token has already been used or has expired, Supabase will redirect here with
 * an error_code query param which we surface with a friendly message.
 */

import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Peskids · Verificando acceso',
  description: 'Verificando tu enlace de acceso al portal de familias.',
};

interface VerifySearchParams {
  error?: string;
  error_code?: string;
  error_description?: string;
  next?: string;
}

interface PageProps {
  searchParams: Promise<VerifySearchParams>;
}

export default async function VerifyPage({ searchParams }: PageProps): Promise<React.ReactElement> {
  const params = await searchParams;

  // If Supabase returned an error (expired / already-used token), show error UI
  if (params.error || params.error_code) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pk-bg px-6">
        <div className="w-full max-w-sm rounded-2xl border border-pk-border bg-pk-card p-8 text-center shadow-md">
          <div className="mb-4 text-4xl">⚠️</div>
          <h1 className="mb-2 text-xl font-semibold text-pk-heading">
            Este enlace ya fue usado o expiró
          </h1>
          <p className="mb-6 text-sm text-pk-sub">
            Los enlaces de acceso son de un solo uso y expiran en 72 horas.
            Solicita uno nuevo al equipo de Peskids o inicia sesión directamente.
          </p>
          <a
            href="/familias/login"
            className="inline-block rounded-xl bg-pk-accent px-6 py-2.5 text-sm font-medium text-white transition hover:opacity-90"
          >
            Iniciar sesión
          </a>
        </div>
      </div>
    );
  }

  // If Supabase exchange was successful, session cookie is already set.
  // Redirect to the intended destination.
  const nextPath = typeof params.next === 'string' && params.next.startsWith('/')
    ? params.next
    : '/familias/submissions';

  redirect(nextPath);
}
