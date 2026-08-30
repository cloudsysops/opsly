'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ClipboardList, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ActiveFormSummary {
  id: string;
  title: string;
  description?: string;
}

export default function FamilyFormsPage(): React.ReactElement {
  const router = useRouter();
  const [forms, setForms] = useState<ActiveFormSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch('/api/forms', { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
          router.replace('/familias/login?next=%2Ffamilias%2Fforms');
          return;
        }
        if (!response.ok) {
          throw new Error('No se pudieron cargar los formularios.');
        }

        const payload = (await response.json()) as { forms?: ActiveFormSummary[] };
        setForms(payload.forms ?? []);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : 'No se pudieron cargar los formularios.'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  return (
    <main className="min-h-screen bg-pk-bg px-4 py-10">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <p className="pk-eyebrow">Portal familias</p>
          <h1 className="mt-2 text-3xl font-bold text-pk-ink">Formularios disponibles</h1>
          <p className="mt-2 text-sm text-pk-sub">
            Completa las actividades y formularios publicados por el equipo Peskids.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 py-12 text-pk-sub">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Cargando formularios…
          </div>
        ) : error ? (
          <Card>
            <CardHeader>
              <CardTitle>No fue posible cargar los formularios</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : forms.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No hay formularios pendientes</CardTitle>
              <CardDescription>Cuando Peskids publique uno, aparecerá aquí.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {forms.map((form) => (
              <Card key={form.id} accent="teal">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5 text-pk-primary" aria-hidden />
                    {form.title}
                  </CardTitle>
                  {form.description && <CardDescription>{form.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <Link href={`/familias/forms/${encodeURIComponent(form.id)}`}>
                    <Button>Completar formulario</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Link href="/familias">
          <Button variant="ghost">Volver al portal</Button>
        </Link>
      </div>
    </main>
  );
}
