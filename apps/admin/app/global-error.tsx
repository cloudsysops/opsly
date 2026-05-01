'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { RefreshCcw, ShieldAlert } from 'lucide-react';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('admin global error', error);
  }, [error]);

  return (
    <html lang="es">
      <body className="min-h-screen bg-ops-bg text-neutral-100">
        <div className="cyber-grid-bg" />
        <div className="flex min-h-screen items-center justify-center px-6">
          <div className="holo-border neon-glow w-full max-w-2xl rounded-2xl bg-ops-surface/85 p-8">
            <div className="mb-4 flex items-center gap-2 font-display text-ops-red">
              <ShieldAlert className="h-5 w-5" />
              CLIENT RUNTIME FAILURE
            </div>
            <h1 className="font-display text-2xl text-ops-cyan">Se detectó una excepción en frontend</h1>
            <p className="mt-3 text-sm text-neutral-300">
              El sistema capturó el error y aisló la pantalla para evitar caída total del panel.
            </p>
            {error.digest ? (
              <p className="digital-readout mt-2 text-xs text-ops-magenta">digest: {error.digest}</p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={reset}
                className="cyber-hover inline-flex items-center gap-2 rounded-lg border border-ops-cyan/60 bg-ops-cyan/10 px-4 py-2 text-sm text-ops-cyan"
              >
                <RefreshCcw className="h-4 w-4" />
                Reintentar render
              </button>
              <Link
                href="/dashboard"
                className="cyber-hover rounded-lg border border-ops-magenta/60 bg-ops-magenta/10 px-4 py-2 text-sm text-ops-magenta"
              >
                Volver al dashboard
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
