"use client";

import type { FormEvent, ReactElement } from "react";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";

export default function LoginPage(): ReactElement {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: signError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signError) {
        setError(signError.message);
        setLoading(false);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main
      id="main-content"
      className="ops-auth-backdrop flex min-h-screen flex-col items-center justify-center px-4 py-12"
    >
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:rounded-sm focus:bg-ops-green focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-ops-bg"
      >
        Saltar al formulario
      </a>
      <div className="relative w-full max-w-sm space-y-8">
        <div className="text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ops-gray">
            Opsly
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-neutral-100">
            Portal de cliente
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Inicia sesión con el email de tu invitación.
          </p>
        </div>
        <form
          onSubmit={(e) => void onSubmit(e)}
          className="space-y-4 rounded-lg border border-ops-border/80 bg-ops-surface/60 p-6 shadow-xl shadow-black/30 backdrop-blur-sm"
          aria-busy={loading}
        >
          {error ? (
            <p
              role="alert"
              className="rounded-sm border border-ops-red/40 bg-ops-red/10 px-3 py-2 text-sm text-ops-red"
            >
              {error}
            </p>
          ) : null}
          <div>
            <label htmlFor="email" className="mb-1 block text-xs uppercase tracking-wide text-ops-gray">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(ev) => setEmail(ev.target.value)}
              className="input-terminal-caret w-full rounded-sm border border-ops-border bg-ops-bg/80 px-3 py-2.5 text-sm text-neutral-100 outline-none transition-colors focus:border-ops-green focus:ring-2 focus:ring-ops-green/30"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-xs uppercase tracking-wide text-ops-gray">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(ev) => setPassword(ev.target.value)}
              className="input-terminal-caret w-full rounded-sm border border-ops-border bg-ops-bg/80 px-3 py-2.5 text-sm text-neutral-100 outline-none transition-colors focus:border-ops-green focus:ring-2 focus:ring-ops-green/30"
            />
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
                Entrando…
              </>
            ) : (
              "Entrar"
            )}
          </Button>
        </form>
        <p className="text-center text-xs leading-relaxed text-ops-gray">
          ¿Primera vez? Revisa tu email de invitación y el enlace de activación.
        </p>
      </div>
    </main>
  );
}
