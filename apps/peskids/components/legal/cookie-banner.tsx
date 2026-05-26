'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';

const STORAGE_KEY = 'pk-cookie-consent';

export function CookieBanner(): React.ReactElement | null {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) setVisible(true);
    } catch {
      // Private browsing or storage blocked — show banner to be safe
      setVisible(true);
    }
  }, []);

  const accept = (): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: true, at: Date.now() }));
    } catch {
      // ignore
    }
    setVisible(false);
  };

  const dismiss = (): void => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ accepted: false, at: Date.now() }));
    } catch {
      // ignore
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Aviso de cookies"
      aria-live="polite"
      className="fixed bottom-3 left-3 right-3 z-50 mx-auto max-w-[calc(100vw-1.5rem)] rounded-xl border border-pk-border/80 bg-white/96 p-2.5 shadow-lg backdrop-blur sm:bottom-5 sm:left-5 sm:right-auto sm:max-w-lg sm:rounded-2xl sm:p-3"
    >
      <div className="flex items-start gap-2.5 sm:gap-3">
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-pk-ink sm:text-sm">
            Usamos cookies esenciales
          </p>
          <p className="mt-0.5 text-[10px] leading-snug text-pk-sub sm:mt-1 sm:text-[11px] sm:leading-relaxed">
            Solo usamos cookies estrictamente necesarias para el funcionamiento del sitio (sesión de
            staff). No hay cookies de rastreo ni publicidad.{' '}
            <Link href="/cookies" className="text-pk-primary hover:underline">
              Ver política
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          className="shrink-0 rounded-md p-1 text-pk-sub hover:bg-pk-muted sm:rounded-lg"
          aria-label="Cerrar aviso"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 sm:mt-3 sm:gap-2">
        <button
          type="button"
          onClick={accept}
          className="rounded-lg bg-pk-primary px-3.5 py-1.5 text-[11px] font-semibold text-white hover:bg-pk-primary/90 sm:px-4 sm:text-xs"
        >
          Entendido
        </button>
        <Link
          href="/cookies"
          className="rounded-lg border border-pk-border px-3.5 py-1.5 text-[11px] font-semibold text-pk-sub hover:bg-pk-muted sm:px-4 sm:text-xs"
        >
          Más información
        </Link>
      </div>
    </div>
  );
}
