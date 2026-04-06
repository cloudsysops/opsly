"use client";

import { Sparkles, Terminal } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactElement } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";
import { postPortalMode } from "@/lib/tenant";
import type { PortalMode } from "@/types";

export function ModeSelector(): ReactElement {
  const router = useRouter();
  const [loading, setLoading] = useState<PortalMode | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectMode = async (mode: PortalMode): Promise<void> => {
    setError(null);
    setLoading(mode);
    try {
      const supabase = createClient();
      const { data, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !data.session?.access_token) {
        setError("No hay sesión. Vuelve a iniciar sesión.");
        setLoading(null);
        return;
      }
      await postPortalMode(data.session.access_token, mode);
      router.push(mode === "developer" ? "/dashboard/developer" : "/dashboard/managed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar el modo");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
      {error ? (
        <p className="md:col-span-2 text-center text-sm text-ops-red">{error}</p>
      ) : null}
      <article className="flex flex-col rounded-lg border border-ops-border bg-ops-surface p-6">
        <div className="mb-4 flex items-center gap-3">
          <Terminal className="h-8 w-8 text-ops-green" aria-hidden />
          <span className="rounded-sm border border-ops-border px-2 py-0.5 text-xs text-ops-gray">
            Para técnicos
          </span>
        </div>
        <h2 className="text-lg font-semibold text-neutral-100">
          Yo administro mis agentes
        </h2>
        <p className="mt-2 flex-1 text-sm text-neutral-400">
          Acceso directo a n8n, credenciales, logs y configuración avanzada.
        </p>
        <Button
          className="mt-6"
          variant="primary"
          disabled={loading !== null}
          onClick={() => void selectMode("developer")}
        >
          {loading === "developer" ? "Guardando…" : "Entrar en modo developer"}
        </Button>
      </article>

      <article className="flex flex-col rounded-lg border border-ops-green/30 bg-ops-surface p-6 ring-1 ring-ops-green/20">
        <div className="mb-4 flex items-center gap-3">
          <Sparkles className="h-8 w-8 text-ops-green" aria-hidden />
          <span className="rounded-sm border border-ops-green/40 bg-ops-green/10 px-2 py-0.5 text-xs text-ops-green">
            Recomendado
          </span>
        </div>
        <h2 className="text-lg font-semibold text-neutral-100">
          Opsly administra mis agentes
        </h2>
        <p className="mt-2 flex-1 text-sm text-neutral-400">
          Ve el estado de tus automatizaciones sin preocuparte por la infraestructura.
        </p>
        <Button
          className="mt-6"
          variant="primary"
          disabled={loading !== null}
          onClick={() => void selectMode("managed")}
        >
          {loading === "managed" ? "Guardando…" : "Entrar en modo managed"}
        </Button>
      </article>
    </div>
  );
}
