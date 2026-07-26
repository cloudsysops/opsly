'use client';

import Link from 'next/link';
import { Eye, Users } from 'lucide-react';
import { RoleSwitcher } from '@/components/admin/role-switcher';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Staff-only family surface preview.
 * Does not mutate user_metadata.role and never routes to /familias/* auth gates.
 */
export default function AdminFamilyPreviewPage(): React.ReactElement {
  return (
    <main className="min-h-screen bg-pk-muted/40 px-4 py-6 sm:px-6">
      <div className="mx-auto flex max-w-4xl flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-pk-mutedText">
              Vista previa
            </p>
            <h1 className="mt-1 text-2xl font-bold text-pk-ink">Familia (solo lectura)</h1>
            <p className="mt-1 max-w-2xl text-sm text-pk-sub">
              Simula lo que ve una familia sin cambiar tu rol ni entrar a{' '}
              <code className="rounded bg-white px-1">/familias/submissions</code>. No se muta{' '}
              <code className="rounded bg-white px-1">user_metadata.role</code>.
            </p>
          </div>
          <RoleSwitcher />
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          <Eye className="h-4 w-4 shrink-0" aria-hidden />
          <span>
            Modo preview para owner/admin/soporte. Los datos reales de familia siguen detrás del login
            de familias.
          </span>
          <Badge className="ml-auto bg-amber-100 text-amber-900">read-only</Badge>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" aria-hidden />
              Panel familia (esqueleto)
            </CardTitle>
            <CardDescription>
              Entregas del niño, próximas clases y mensajes — así lo verá el acudiente cuando active su
              acceso.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-pk-sub">
            <p>
              En operación real, la familia entra por{' '}
              <Link href="/familias/login" className="font-medium text-pk-primary underline">
                /familias/login
              </Link>{' '}
              con su propia sesión. Desde admin solo usamos esta preview para QA visual.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>Entregas / tareas del estudiante</li>
              <li>Próxima clase reservada</li>
              <li>Notas visibles para familia</li>
              <li>WhatsApp de contacto (manual en soft-launch)</li>
            </ul>
            <div className="flex flex-wrap gap-2 pt-2">
              <Link
                href="/admin"
                className="inline-flex h-9 items-center justify-center rounded-lg border border-pk-border bg-pk-surface px-4 text-xs font-bold text-pk-ink hover:bg-pk-snow"
              >
                Volver a Admin
              </Link>
              <Link
                href="/teacher/dashboard"
                className="inline-flex h-9 items-center justify-center rounded-lg px-4 text-xs font-bold text-pk-sub hover:bg-pk-muted hover:text-pk-ink"
              >
                Ver panel Profesor
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
