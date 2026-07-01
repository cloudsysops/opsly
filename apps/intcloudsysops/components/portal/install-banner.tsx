'use client';

import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'pwa-banner-dismissed';

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches;
}

function isDismissed(): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function InstallBanner(): React.ReactElement | null {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    // Don't show if already in standalone mode or dismissed
    if (isStandalone() || isDismissed()) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setPromptEvent(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  if (!visible || !promptEvent) return null;

  const handleInstall = async (): Promise<void> => {
    if (!promptEvent || installing) return;
    setInstalling(true);
    try {
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setVisible(false);
      }
    } catch {
      // ignore
    } finally {
      setInstalling(false);
    }
  };

  const handleDismiss = (): void => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      // ignore
    }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-pk-primary/20 bg-pk-primary/5 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3 text-sm text-pk-ink">
        <span className="text-base" aria-hidden>
          📱
        </span>
        <span>
          Instala Peskids en tu celular para recibir notificaciones{' '}
          <strong>sin WhatsApp</strong>
        </span>
      </div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={() => void handleInstall()}
          disabled={installing}
          className="h-8 gap-1.5 text-xs"
        >
          <Download className="h-3.5 w-3.5" aria-hidden />
          Instalar
        </Button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Cerrar"
          className="flex h-7 w-7 items-center justify-center rounded-full text-pk-mutedText transition-colors hover:bg-pk-border hover:text-pk-ink"
        >
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
