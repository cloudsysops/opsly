'use client';

import { useState } from 'react';
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

  const missingRequires = mod.requires; // full dependency check happens server-side; this is UI-only fast feedback
  const canActivate = mod.status === 'not_installed' || mod.status === 'failed';

  async function handleActivate(): Promise<void> {
    setBusy(true);
    try {
      await activateTenantModule(slug, mod.id);
      onChanged();
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  }

  async function handleMarkDone(): Promise<void> {
    setBusy(true);
    try {
      await markManualStepsDone(slug, mod.id);
      onChanged();
    } finally {
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

        {mod.status === 'active_needs_manual_steps' && (
          <div className="space-y-1">
            <ul className="list-disc pl-4 font-sans text-xs text-ops-gray">
              {mod.manual_steps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
            <Button size="sm" variant="default" disabled={busy} onClick={() => void handleMarkDone()}>
              Marcar completado
            </Button>
          </div>
        )}

        {canActivate && !confirming && (
          <Button
            size="sm"
            disabled={busy}
            title={missingRequires.length > 0 ? `Requiere: ${missingRequires.join(', ')}` : undefined}
            onClick={() => setConfirming(true)}
          >
            {mod.status === 'failed' ? 'Reintentar' : 'Activar'}
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
              <Button size="sm" variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
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
  const { data, isLoading, mutate } = useTenantModules(slug);

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
