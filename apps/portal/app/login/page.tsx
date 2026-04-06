"use client";

import type { FormEvent, ReactElement } from "react";
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
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-ops-green">Opsly</h1>
          <p className="mt-1 text-sm text-ops-gray">Portal de Cliente</p>
        </div>
        <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
          {error ? (
            <p className="rounded-sm border border-ops-red/40 bg-ops-red/10 px-3 py-2 text-sm text-ops-red">
              {error}
            </p>
          ) : null}
          <div>
            <label htmlFor="email" className="mb-1 block text-xs uppercase text-ops-gray">
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
              className="input-terminal-caret w-full rounded-sm border border-ops-border bg-ops-surface px-3 py-2 text-sm text-neutral-100 outline-none focus:border-ops-green"
            />
          </div>
          <div>
            <label htmlFor="password" className="mb-1 block text-xs uppercase text-ops-gray">
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
              className="input-terminal-caret w-full rounded-sm border border-ops-border bg-ops-surface px-3 py-2 text-sm text-neutral-100 outline-none focus:border-ops-green"
            />
          </div>
          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? "Entrando…" : "Entrar"}
          </Button>
        </form>
        <p className="text-center text-xs text-ops-gray">
          ¿Primera vez? Revisa tu email de invitación.
        </p>
      </div>
    </main>
  );
}
