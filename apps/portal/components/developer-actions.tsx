'use client';

import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';

type DeveloperActionsProps = {
  n8nUrl: string | null;
  n8nUser: string | null;
  n8nPassword: string | null;
};

export function DeveloperActions({
  n8nUrl,
  n8nUser,
  n8nPassword,
}: DeveloperActionsProps): ReactElement {
  const [msg, setMsg] = useState<string | null>(null);

  const copyText = useCallback(async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setMsg(`${label} copiado`);
      window.setTimeout(() => setMsg(null), 2500);
    } catch {
      setMsg('No se pudo copiar');
    }
  }, []);

  return (
    <div className="space-y-3">
      {msg ? <p className="text-xs text-ops-green">{msg}</p> : null}
      <div className="flex flex-wrap gap-2">
        {n8nUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void copyText('URL', n8nUrl)}
          >
            Copiar URL n8n
          </Button>
        ) : null}
        {n8nUser && n8nPassword ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void copyText('Credenciales', `${n8nUser}:${n8nPassword}`)}
          >
            Copiar credenciales
          </Button>
        ) : null}
      </div>
    </div>
  );
}
