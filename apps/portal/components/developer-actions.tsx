'use client';

import type { ReactElement } from 'react';
import { useCallback, useState } from 'react';
import { Check, Copy } from 'lucide-react';
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyText = useCallback(async (key: string, label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setMsg(`${label} copiado`);
      window.setTimeout(() => {
        setMsg(null);
        setCopiedKey(null);
      }, 2500);
    } catch {
      setMsg('No se pudo copiar');
    }
  }, []);

  return (
    <div className="space-y-3">
      <p role="status" aria-live="polite" className="text-xs text-ops-green min-h-[1rem]">
        {msg ?? ''}
      </p>
      <div className="flex flex-wrap gap-2">
        {n8nUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void copyText('url', 'URL', n8nUrl)}
            aria-label={copiedKey === 'url' ? 'URL n8n copiada' : 'Copiar URL n8n'}
          >
            {copiedKey === 'url' ? (
              <Check className="h-4 w-4 shrink-0 mr-1 text-ops-green" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4 shrink-0 mr-1" aria-hidden="true" />
            )}
            <span>Copiar URL n8n</span>
          </Button>
        ) : null}
        {n8nUser && n8nPassword ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void copyText('creds', 'Credenciales', `${n8nUser}:${n8nPassword}`)}
            aria-label={copiedKey === 'creds' ? 'Credenciales copiadas' : 'Copiar credenciales'}
          >
            {copiedKey === 'creds' ? (
              <Check className="h-4 w-4 shrink-0 mr-1 text-ops-green" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4 shrink-0 mr-1" aria-hidden="true" />
            )}
            <span>Copiar credenciales</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
