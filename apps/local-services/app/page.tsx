import type { ReactElement } from 'react';
import Link from 'next/link';

export default function HomePage(): ReactElement {
  return (
    <main className="mx-auto max-w-lg px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold text-white">Equipa</h1>
      <p className="mt-2 text-sm text-neutral-400">Limpieza de equipos y upgrade</p>
      <Link
        href="/book"
        className="mt-8 inline-block rounded bg-ops-green px-6 py-2 text-sm font-medium text-black"
      >
        Reservar servicio
      </Link>
    </main>
  );
}
