'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Announcer } from '@/components/ui/accessibility';
import { cn } from '@/lib/utils';

const REVEAL_SECONDS = 30;

type CredentialRevealProps = {
  password: string | null;
};

export function CredentialReveal({ password }: CredentialRevealProps): ReactElement {
  const [visible, setVisible] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [copied, setCopied] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (!visible || secondsLeft <= 0) {
      return;
    }
    const id = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setVisible(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [visible, secondsLeft]);

  const toggleVisibility = useCallback(() => {
    if (!password || password.length === 0) {
      return;
    }

    if (visible) {
      setVisible(false);
      setSecondsLeft(0);
      setAnnouncement('Contraseña oculta');
    } else {
      setVisible(true);
      setSecondsLeft(REVEAL_SECONDS);
      setAnnouncement('Contraseña revelada');
    }
  }, [password, visible]);

  const copyToClipboard = useCallback(async () => {
    if (!password) {
      return;
    }
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setAnnouncement('Contraseña copiada al portapapeles');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setAnnouncement('Error al copiar la contraseña');
    }
  }, [password]);

  if (!password) {
    return <span className="font-mono text-sm text-ops-gray">—</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Announcer message={announcement} />
      <span className="font-mono text-sm">{visible ? password : '••••••••'}</span>
      {visible && secondsLeft > 0 ? (
        <span className="text-xs text-ops-gray">({secondsLeft}s)</span>
      ) : null}
      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={toggleVisibility}
          aria-label={visible ? 'Ocultar contraseña' : 'Revelar contraseña'}
          title={visible ? 'Ocultar' : 'Revelar'}
        >
          {visible ? (
            <EyeOff className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <Eye className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{visible ? 'Ocultar' : 'Revelar'}</span>
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => void copyToClipboard()}
          aria-label="Copiar contraseña"
          title="Copiar"
          className={cn(copied && 'text-ops-green')}
        >
          {copied ? (
            <Check className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <Copy className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{copied ? 'Copiado' : 'Copiar'}</span>
        </Button>
      </div>
    </div>
  );
}
