'use client';

import Link from 'next/link';
import { AlertTriangle, Home, Radar } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6">
      <div className="holo-border neon-glow w-full max-w-2xl rounded-2xl bg-ops-surface/80 p-8">
        <div className="mb-4 flex items-center gap-2 font-display text-ops-magenta">
          <AlertTriangle className="h-5 w-5" />
          ROUTE NOT FOUND
        </div>
        <h1 data-text="404 :: SIGNAL LOST" className="glitch-text text-3xl text-ops-cyan">
          404 :: SIGNAL LOST
        </h1>
        <p className="mt-4 max-w-xl text-sm text-neutral-300">
          Esta ruta no existe en el nodo actual. Volvamos al panel principal para reanclar la
          navegación.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="cyber-hover inline-flex items-center gap-2 rounded-lg border border-ops-cyan/60 bg-ops-cyan/10 px-4 py-2 text-sm text-ops-cyan"
          >
            <Home className="h-4 w-4" />
            Ir a Dashboard
          </Link>
          <Link
            href="/tenants"
            className="cyber-hover inline-flex items-center gap-2 rounded-lg border border-ops-magenta/60 bg-ops-magenta/10 px-4 py-2 text-sm text-ops-magenta"
          >
            <Radar className="h-4 w-4" />
            Ver Tenants
          </Link>
        </div>
      </div>
    </div>
  );
}
