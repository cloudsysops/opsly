'use client';

import { useEffect, useState } from 'react';
import { Cable } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { IntegrationsStatus } from '@/lib/services/integrations-status.service';

const INTEGRATION_LABEL: Record<keyof IntegrationsStatus, string> = {
  twenty: 'Twenty CRM',
  wacrm: 'wacrm (WhatsApp)',
  wompi: 'Wompi (PSE/Nequi)',
  stripe: 'Stripe',
};

const STATUS_TONE: Record<IntegrationsStatus[keyof IntegrationsStatus]['status'], 'green' | 'neutral' | 'amber'> = {
  connected: 'green',
  disabled: 'neutral',
  not_configured: 'amber',
};

export function IntegrationsStatusPanel(): React.ReactElement {
  const [status, setStatus] = useState<IntegrationsStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/integrations-status', { credentials: 'include' });
        const json = (await res.json()) as { integrations?: IntegrationsStatus; error?: string };
        if (cancelled) return;
        if (!res.ok || !json.integrations) {
          setError(json.error ?? 'No se pudo cargar el estado de integraciones');
          return;
        }
        setStatus(json.integrations);
      } catch {
        if (!cancelled) setError('Error al cargar el estado de integraciones');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card className="mb-8 border-pk-border bg-white shadow-card">
      <CardHeader className="flex flex-row items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-pk-primary">
          <Cable className="h-4 w-4" aria-hidden />
        </span>
        <div>
          <CardTitle className="text-base">Estado de integraciones</CardTitle>
          <CardDescription>
            Lo que corre por detrás — no necesitas abrir estas plataformas para saber si funcionan.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {error ? (
          <p className="text-sm text-pk-sub">{error}</p>
        ) : !status ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.keys(INTEGRATION_LABEL).map((key) => (
              <div key={key} className="h-14 animate-pulse rounded-xl bg-pk-muted" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(Object.keys(INTEGRATION_LABEL) as Array<keyof IntegrationsStatus>).map((key) => (
              <div key={key} className="rounded-xl border border-pk-border bg-pk-snow p-3">
                <p className="text-xs font-semibold text-pk-ink">{INTEGRATION_LABEL[key]}</p>
                <Badge tone={STATUS_TONE[status[key].status]} className="mt-2">
                  {status[key].label}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
