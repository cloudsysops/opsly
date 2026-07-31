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
  const [copied, setCopied] = useState<'url' | 'creds' | null>(null);

  useEffect(() => {
    if (!copied) return;
    const t = setTimeout(() => setCopied(null), 2500);
    return () => clearTimeout(t);
  }, [copied]);

  const copyText = useCallback(async (type: 'url' | 'creds', text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
    } catch {
      console.error('Failed to copy');
    }
  }, []);

  const items = [
    n8nUrl && { type: 'url' as const, val: n8nUrl, normal: 'Copiar URL n8n', done: 'URL copiada', ariaN: 'Copiar URL de n8n al portapapeles', ariaD: 'URL de n8n copiada' },
    n8nUser && n8nPassword && { type: 'creds' as const, val: `${n8nUser}:${n8nPassword}`, normal: 'Copiar credenciales', done: 'Credenciales copiadas', ariaN: 'Copiar credenciales al portapapeles', ariaD: 'Credenciales copiadas' }
  ].filter((i): i is NonNullable<typeof i> => !!i);

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ type, val, normal, done, ariaN, ariaD }) => (
        <Button
          key={type}
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void copyText(type, val)}
          aria-label={copied === type ? ariaD : ariaN}
          title={copied === type ? '¡Copiado!' : normal}
          className={`flex items-center gap-1.5 transition-colors duration-200 ${
            copied === type ? 'text-ops-green bg-ops-green/10' : ''
          }`}
        >
          {copied === type ? <Check className="h-4 w-4 shrink-0" /> : <Copy className="h-4 w-4 shrink-0" />}
          <span>{copied === type ? done : normal}</span>
        </Button>
      ))}
    </div>
  );
}
