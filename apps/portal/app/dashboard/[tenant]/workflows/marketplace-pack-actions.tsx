'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { postPortalN8nMarketplaceInstall } from '@/lib/tenant';

type MarketplacePackActionsProps = {
  tenantSlug: string;
  catalogItemId: string;
  planMin: string;
  tenantPlan: string;
  installedByDefault: boolean;
  accessToken: string;
  initiallyActivated: boolean;
};

export function MarketplacePackActions({
  tenantSlug,
  catalogItemId,
  planMin,
  tenantPlan,
  installedByDefault,
  accessToken,
  initiallyActivated,
}: MarketplacePackActionsProps): ReactElement {
  const [activated, setActivated] = useState(initiallyActivated);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const demoOrMissingToken = accessToken.length === 0;

  async function onActivate(): Promise<void> {
    setMessage(null);
    setPending(true);
    try {
      const res = await postPortalN8nMarketplaceInstall(
        accessToken,
        tenantSlug,
        catalogItemId
      );
      setActivated(true);
      setMessage(res.already ? 'Ya estaba activado en tu cuenta.' : 'Activado. Facturación registrada.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'No se pudo activar');
    } finally {
      setPending(false);
    }
  }

  if (installedByDefault) {
    return (
      <p className="text-xs text-ops-gray">
        Incluido por defecto en tu n8n. Abre n8n para revisar workflows antes de activarlos.
      </p>
    );
  }

  if (activated) {
    return (
      <p className="text-xs text-ops-green">
        Pack activado en tu cuenta{message ? ` — ${message}` : ''}.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="primary"
          disabled={pending || demoOrMissingToken}
          onClick={() => {
            void onActivate();
          }}
        >
          {pending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Activando…
            </>
          ) : (
            'Activar y registrar uso'
          )}
        </Button>
        <span className="text-xs text-ops-gray">
          Plan mínimo: {planMin} · Tu plan: {tenantPlan}
        </span>
      </div>
      {demoOrMissingToken ? (
        <p className="text-xs text-amber-400/90">
          Modo demo o sin sesión: la activación remota no está disponible.
        </p>
      ) : null}
      {message && !activated ? (
        <p className="text-xs text-amber-400/90" role="status">
          {message}
        </p>
      ) : null}
      {message && activated ? (
        <p className="text-xs text-neutral-400" role="status">
          {message}
        </p>
      ) : null}
    </div>
  );
}
