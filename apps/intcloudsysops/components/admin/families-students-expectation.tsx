'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface FamiliesStudentsExpectationProps {
  activeStudentsCount: number;
}

export function FamiliesStudentsExpectation({
  activeStudentsCount,
}: FamiliesStudentsExpectationProps): React.ReactElement {
  return (
    <section className="mb-5 rounded-3xl border border-pk-border bg-white p-5 shadow-card sm:p-6">
      <Card accent="teal" className="border-0 shadow-none">
        <CardHeader className="px-0 pt-0">
          <CardTitle className="flex items-center gap-2 text-xl">
            <Users className="h-5 w-5 text-pk-primary" aria-hidden />
            Resumen de familias
          </CardTitle>
          <CardDescription className="mt-2 text-sm leading-6">
            Gestiona alumnos matriculados y el contacto del padre o madre en la sección Familias y
            alumnos. Convierte interesados en alumnos cuando confirmen matrícula.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 px-0 pb-0 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-pk-sub">
            Alumnos activos:{' '}
            <span className="font-semibold text-pk-ink">{activeStudentsCount}</span>
          </p>
          <Link
            href="/familias/login"
            className="inline-flex h-9 items-center justify-center rounded-lg border border-pk-border bg-pk-surface px-4 text-xs font-bold text-pk-ink transition-all hover:border-pk-primary/40 hover:bg-pk-snow"
          >
            Ir al portal familias
          </Link>
        </CardContent>
      </Card>
    </section>
  );
}
