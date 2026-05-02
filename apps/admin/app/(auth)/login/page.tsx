'use client';

import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data.session) {
          router.replace('/dashboard');
        }
      })
      .catch(() => {
        // Local demo mode can run without Supabase public env vars.
      });
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signErr) {
        setError(signErr.message);
        return;
      }
      router.refresh();
      router.replace('/dashboard');
    } catch {
      setError('Error de autenticación');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      id="main-content"
      className="ops-auth-backdrop flex min-h-screen flex-col items-center justify-center p-6"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-sm focus:bg-ops-green focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-ops-bg"
      >
        Saltar al formulario
      </a>
      <Card className="w-full max-w-md border-ops-green/40 shadow-xl shadow-black/30 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="font-mono text-ops-green">
            <span className="text-neutral-500">$ </span>login
          </CardTitle>
          <p className="pt-1 font-sans text-sm text-neutral-500">Acceso al panel de operaciones.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-4" aria-busy={loading}>
            {error ? (
              <div
                role="alert"
                className="rounded border border-ops-red/60 bg-ops-red/10 px-3 py-2 font-sans text-sm text-ops-red"
              >
                {error}
              </div>
            ) : null}
            <div className="space-y-1">
              <label className="font-sans text-xs text-ops-gray" htmlFor="email">
                email
              </label>
              <div className="relative">
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pr-6"
                />
                <span
                  className="pointer-events-none absolute right-2 top-1/2 h-4 w-0.5 -translate-y-1/2 animate-blink bg-ops-green"
                  aria-hidden
                />
              </div>
            </div>
            <div className="space-y-1">
              <label className="font-sans text-xs text-ops-gray" htmlFor="password">
                password
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" variant="primary" className="w-full font-mono" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                  authenticate…
                </>
              ) : (
                'authenticate'
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
