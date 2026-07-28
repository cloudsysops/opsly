'use client';

import type { ReactElement } from 'react';
import { useCallback, useState, useEffect } from 'react';
import { Copy, Check } from 'lucide-react';
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
  const [copiedType, setCopiedType] = useState<'url' | 'creds' | 'error' | null>(null);

  useEffect(() => {
    if (!copiedType || copiedType === 'error') return;
    const timeout = setTimeout(() => {
      setCopiedType(null);
    }, 2500);
    return () => clearTimeout(timeout);
  }, [copiedType]);

  const copyText = useCallback(async (type: 'url' | 'creds', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType(type);
    } catch {
      setCopiedType('error');
    }
  }, []);

  return (
    <div className="space-y-3">
      {copiedType === 'error' ? (
        <p className="text-xs text-red-500" role="alert">
          No se pudo copiar
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {n8nUrl ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void copyText('url', n8nUrl)}
            aria-label={
              copiedType === 'url'
                ? 'URL n8n copiada al portapapeles'
                : 'Copiar URL n8n al portapapeles'
            }
            title={copiedType === 'url' ? 'URL copiada' : 'Copiar URL'}
            className={copiedType === 'url' ? 'text-ops-green' : ''}
          >
            {copiedType === 'url' ? (
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>{copiedType === 'url' ? 'URL copiada' : 'Copiar URL n8n'}</span>
          </Button>
        ) : null}
        {n8nUser && n8nPassword ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => void copyText('creds', `${n8nUser}:${n8nPassword}`)}
            aria-label={
              copiedType === 'creds'
                ? 'Credenciales copiadas al portapapeles'
                : 'Copiar credenciales al portapapeles'
            }
            title={copiedType === 'creds' ? 'Credenciales copiadas' : 'Copiar credenciales'}
            className={copiedType === 'creds' ? 'text-ops-green' : ''}
          >
            {copiedType === 'creds' ? (
              <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            <span>{copiedType === 'creds' ? 'Credenciales copiadas' : 'Copiar credenciales'}</span>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
