"use client";

import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase";

export function InviteActivate() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const tokenRaw = typeof params.token === "string" ? params.token : "";
  const token = useMemo(() => decodeURIComponent(tokenRaw), [tokenRaw]);
  const email = searchParams.get("email") ?? "";
  const code = searchParams.get("code");

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const displayName = email.includes("@") ? email.split("@")[0] : "equipo";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (password !== confirm) {
      setErr("Las contraseñas no coinciden");
      return;
    }
    if (password.length < 8) {
      setErr("Mínimo 8 caracteres");
      return;
    }
    if (!email || email.length === 0) {
      setErr("Falta el parámetro email en el enlace");
      return;
    }
    if (!token || token.length === 0) {
      setErr("Token de invitación no válido");
      return;
    }

    setLoading(true);
    try {
      const supabase = createClient();
      if (code && code.length > 0) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          setErr(exchangeError.message);
          return;
        }
      } else {
        const { error: otpError } = await supabase.auth.verifyOtp({
          email,
          token,
          type: "invite",
        });
        if (otpError) {
          setErr(otpError.message);
          return;
        }
      }
      const { error: pwError } = await supabase.auth.updateUser({
        password,
      });
      if (pwError) {
        setErr(pwError.message);
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ops-bg px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="font-mono text-xl font-semibold text-ops-green">Opsly</h1>
          <p className="mt-4 font-sans text-lg text-neutral-100">
            Bienvenido a Opsly, {displayName}
          </p>
          <p className="mt-2 font-sans text-sm text-ops-gray">
            Tu espacio de automatización está listo
          </p>
        </div>
        <form onSubmit={onSubmit} className="space-y-4">
          {err ? (
            <div className="rounded border border-ops-red/40 bg-ops-red/10 px-3 py-2 text-sm text-ops-red">
              {err}
            </div>
          ) : null}
          <div className="space-y-1">
            <label htmlFor="pw" className="font-sans text-xs text-ops-gray">
              Nueva contraseña
            </label>
            <Input
              id="pw"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="pw2" className="font-sans text-xs text-ops-gray">
              Confirmar contraseña
            </label>
            <Input
              id="pw2"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              minLength={8}
            />
          </div>
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            disabled={loading}
          >
            Activar mi cuenta
          </Button>
        </form>
      </div>
    </div>
  );
}
