'use client';

import { useRef, useState } from 'react';
import { activateTenantModule, markManualStepsDone } from '@/lib/api-client';
import type { TenantModule } from '@/lib/types';
import { useTenantModules } from '@/hooks/useTenantModules';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const STATUS_LABEL: Record<TenantModule['status'], string> = {
  not_installed: 'no instalado',
  queued: 'en cola',
  provisioning: 'provisionando…',
  active: 'activo',
  active_needs_manual_steps: 'activo — pasos manuales pendientes',
  failed: 'falló',
  disabled: 'desactivado',
};

function StatusBadge({ status }: { status: TenantModule['status'] }) {
  const color =
    status === 'active'
      ? 'text-ops-green'
      : status === 'failed'
        ? 'text-ops-red'
        : status === 'queued' || status === 'provisioning'
          ? 'text-ops-yellow'
          : 'text-ops-gray';
  return <span className={`font-mono text-xs ${color}`}>{STATUS_LABEL[status]}</span>;
}

const STALE_BUFFER_MINUTES = 5;

/**
 * A `queued`/`provisioning` row whose `updated_at` is older than the bootstrap
 * window (estimated_setup_minutes * 2 + buffer) was almost certainly abandoned
 * by an API process that died mid-run. Mirrors the server-side precondition in
 * apps/api/lib/tenant-modules/activation-guard.ts, which is the actual
 * authority — this only decides whether to offer the retry button.
 */
function isStalledInProgress(mod: TenantModule): boolean {
  if (mod.status !== 'queued' && mod.status !== 'provisioning') {
    return false;
  }
  if (!mod.updated_at) {
    return true;
  }
  const updatedAt = Date.parse(mod.updated_at);
  if (Number.isNaN(updatedAt)) {
    return true;
  }
  const windowMs = (mod.estimated_setup_minutes * 2 + STALE_BUFFER_MINUTES) * 60_000;
  return Date.now() - updatedAt > windowMs;
}

function ModuleRow({
  slug,
  mod,
  onChanged,
}: {
  slug: string;
  mod: TenantModule;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const busyRef = useRef(false);

  const missingRequires = mod.requires; // full dependency check happens server-side; this is UI-only fast feedback
  const stalled = isStalledInProgress(mod);
  const activatableStatus = mod.status === 'not_installed' || mod.status === 'failed' || stalled;
  const canActivate = activatableStatus && mod.automatable;
  const needsManualSetup = activatableStatus && !mod.automatable;

  async function handleActivate(): Promise<void> {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setActionError(null);
    try {
      const result = await activateTenantModule(slug, mod.id);
      if ('missing_dependencies' in result) {
        setActionError(
          `Faltan módulos requeridos: ${result.missing_dependencies.join(', ')}. Activá esos primero.`
        );
        return;
      }
      onChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo activar el módulo');
    } finally {
      busyRef.current = false;
      setBusy(false);
      setConfirming(false);
    }
  }

  async function handleMarkDone(): Promise<void> {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setActionError(null);
    try {
      await markManualStepsDone(slug, mod.id);
      onChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'No se pudo marcar como completado');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="font-mono text-sm font-normal text-neutral-200">{mod.name}</CardTitle>
        <StatusBadge status={mod.status} />
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="font-sans text-xs text-ops-gray">{mod.description}</p>

        {mod.status === 'failed' && mod.last_error && (
          <p className="font-mono text-xs text-ops-red">{mod.last_error.slice(0, 300)}</p>
        )}

        {actionError && <p className="font-mono text-xs text-ops-red">{actionError}</p>}

        {mod.status === 'active_needs_manual_steps' && (
          <div className="space-y-1">
            <ul className="list-disc pl-4 font-sans text-xs text-ops-gray">
              {mod.manual_steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            <Button
              size="sm"
              variant="default"
              disabled={busy}
              onClick={() => void handleMarkDone()}
            >
              Marcar completado
            </Button>
          </div>
        )}

        {needsManualSetup && (
          <p className="font-mono text-xs text-ops-yellow">
            Requiere setup manual — ver scripts/tenants/bootstrap-{mod.id}.sh
          </p>
        )}

        {stalled && (
          <p className="font-mono text-xs text-ops-yellow">
            Sin novedades desde hace rato — el proceso pudo haberse caído. Podés reintentar.
          </p>
        )}

        {canActivate && !confirming && (
          <Button
            size="sm"
            disabled={busy}
            title={
              missingRequires.length > 0 ? `Requiere: ${missingRequires.join(', ')}` : undefined
            }
            onClick={() => setConfirming(true)}
          >
            {mod.status === 'failed' || stalled ? 'Reintentar' : 'Activar'}
          </Button>
        )}

        {canActivate && confirming && (
          <div className="space-y-2 rounded border border-ops-yellow/40 p-2">
            <p className="font-sans text-xs text-neutral-300">
              Esto va a correr el script de bootstrap en el VPS (~{mod.estimated_setup_minutes} min,
              costo {mod.cost_level}).
            </p>
            {mod.manual_steps.length > 0 && (
              <p className="font-sans text-xs text-ops-gray">
                Después vas a tener que completar {mod.manual_steps.length} paso(s) manual(es).
              </p>
            )}
            <div className="flex gap-2">
              <Button size="sm" disabled={busy} onClick={() => void handleActivate()}>
                Confirmar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => setConfirming(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function ModulesCard({ slug }: { slug: string }) {
  const { data, error, isLoading, mutate } = useTenantModules(slug);

  if (error) {
    return (
      <div>
        <h2 className="mb-3 font-mono text-sm text-neutral-400">Módulos</h2>
        <div className="rounded border border-ops-red/50 bg-ops-red/10 px-3 py-2 font-sans text-sm text-ops-red">
          {error.message}
        </div>
      </div>
    );
  }

  if (isLoading || !data) {
    return null;
  }

  return (
    <div>
      <h2 className="mb-3 font-mono text-sm text-neutral-400">Módulos</h2>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {data.modules.map((mod) => (
          <ModuleRow key={mod.id} slug={slug} mod={mod} onChanged={mutate} />
        ))}
      </div>
    </div>
  );
}
