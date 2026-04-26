'use client';

import { Loader2, ShieldCheck, Sparkles, Terminal } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactElement } from 'react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase';
import { fetchPortalTenant, postPortalMode, tenantSlugFromUserMetadata } from '@/lib/tenant';
import type { PortalMode } from '@/types';

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
        setError('No hay sesión. Vuelve a iniciar sesión.');
        setLoading(null);
        return;
      }
      const token = data.session.access_token;
      const slug = tenantSlugFromUserMetadata(data.session.user);
      const tenant = await fetchPortalTenant(token, slug);
      await postPortalMode(token, mode, tenant.slug);
      const target = mode === 'managed' ? '/dashboard/managed' : '/dashboard/developer';
      router.push(target);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el modo');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
      {error ? (
        <p role="alert" className="md:col-span-2 text-center text-sm text-ops-red">
          {error}
        </p>
      ) : null}
      <article className="group flex flex-col rounded-lg border border-ops-border bg-ops-surface/80 p-6 shadow-sm shadow-black/20 transition-[border-color,box-shadow,transform] duration-200 hover:border-ops-border/90 hover:shadow-md focus-within:border-ops-green/40 focus-within:ring-2 focus-within:ring-ops-green/25 md:hover:-translate-y-0.5">
        <div className="mb-4 flex items-center gap-3">
          <Terminal
            className="h-8 w-8 shrink-0 text-ops-green transition-transform duration-200 group-hover:scale-105"
            aria-hidden
          />
          <span className="rounded-sm border border-ops-border px-2 py-0.5 text-xs text-ops-gray">
            Para técnicos
          </span>
        </div>
        <h2 className="text-lg font-semibold text-neutral-100">Yo administro mis agentes</h2>
        <p className="mt-2 flex-1 text-sm text-neutral-400">
          Acceso directo a n8n, credenciales, logs y configuración avanzada.
        </p>
        <Button
          className="mt-6"
          variant="primary"
          disabled={loading !== null}
          onClick={() => void selectMode('developer')}
        >
          {loading === 'developer' ? (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              Guardando…
            </>
          ) : (
            'Entrar en modo developer'
          )}
        </Button>
      </article>

      <article className="group flex flex-col rounded-lg border border-ops-green/35 bg-ops-surface/90 p-6 shadow-md shadow-black/25 ring-1 ring-ops-green/25 transition-[border-color,box-shadow,transform] duration-200 hover:border-ops-green/50 hover:shadow-lg focus-within:ring-2 focus-within:ring-ops-green/40 md:hover:-translate-y-0.5">
        <div className="mb-4 flex items-center gap-3">
          <Sparkles
            className="h-8 w-8 shrink-0 text-ops-green transition-transform duration-200 group-hover:scale-105"
            aria-hidden
          />
          <span className="rounded-sm border border-ops-green/40 bg-ops-green/10 px-2 py-0.5 text-xs text-ops-green">
            Recomendado
          </span>
        </div>
        <h2 className="text-lg font-semibold text-neutral-100">Opsly administra mis agentes</h2>
        <p className="mt-2 flex-1 text-sm text-neutral-400">
          Ve el estado de tus automatizaciones sin preocuparte por la infraestructura.
        </p>
        <Button
          className="mt-6"
          variant="primary"
          disabled={loading !== null}
          onClick={() => void selectMode('managed')}
        >
          {loading === 'managed' ? (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              Guardando…
            </>
          ) : (
            'Entrar en modo managed'
          )}
        </Button>
      </article>

      <article className="group flex flex-col rounded-lg border border-amber-500/35 bg-ops-surface/90 p-6 shadow-md shadow-black/25 ring-1 ring-amber-500/25 transition-[border-color,box-shadow,transform] duration-200 hover:border-amber-500/50 hover:shadow-lg focus-within:ring-2 focus-within:ring-amber-400/40 md:hover:-translate-y-0.5">
        <div className="mb-4 flex items-center gap-3">
          <ShieldCheck
            className="h-8 w-8 shrink-0 text-amber-400 transition-transform duration-200 group-hover:scale-105"
            aria-hidden
          />
          <span className="rounded-sm border border-amber-400/40 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-300">
            Security defense
          </span>
        </div>
        <h2 className="text-lg font-semibold text-neutral-100">Modo defensa activa</h2>
        <p className="mt-2 flex-1 text-sm text-neutral-400">
          Perfil para auditoría y respuesta a incidentes defensivos autorizados.
        </p>
        <Button
          className="mt-6"
          variant="primary"
          disabled={loading !== null}
          onClick={() => void selectMode('security_defense')}
        >
          {loading === 'security_defense' ? (
            <>
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              Guardando…
            </>
          ) : (
            'Entrar en modo security defense'
          )}
        </Button>
      </article>
    </div>
  );
}
