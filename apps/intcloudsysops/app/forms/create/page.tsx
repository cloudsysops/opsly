'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle } from 'lucide-react';
import { FormBuilder } from '@/components/forms/form-builder';
import { Button } from '@/components/ui/button';
import type { Form } from '@/lib/form-types';

export default function CreateFormPage(): React.ReactElement {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [createdId, setCreatedId] = useState<string | null>(null);

  const handleSave = useCallback(
    async (form: Form): Promise<void> => {
      setSaving(true);
      setError('');

      try {
        const fieldsForApi = form.fields.map((f) => ({
          type: f.type,
          label: f.label,
          required: f.required,
          options: f.options,
        }));

        const response = await fetch('/api/forms', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            title: form.title,
            description: form.description || '',
            fields: fieldsForApi,
            status: 'draft',
          }),
        });

        const data = (await response.json()) as {
          ok?: boolean;
          error?: string;
          formId?: string;
        };

        if (!response.ok) {
          throw new Error(data.error || 'Error al guardar la forma');
        }

        setCreatedId(data.formId ?? null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al guardar la forma';
        setError(message);
      } finally {
        setSaving(false);
      }
    },
    []
  );

  if (createdId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-pk-bg p-4">
        <div className="max-w-md rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center shadow-card">
          <CheckCircle className="mx-auto h-12 w-12 text-emerald-500" aria-hidden />
          <h2 className="mt-4 text-xl font-semibold text-emerald-900">Forma guardada</h2>
          <p className="mt-2 text-sm text-emerald-700">
            La forma se creó correctamente. Puedes compartir el enlace o seguir editándola.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              variant="primary"
              onClick={() => router.push('/teacher/dashboard')}
            >
              Ir al dashboard
            </Button>
            <Button
              variant="secondary"
              onClick={() => setCreatedId(null)}
            >
              Crear otra forma
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pk-bg p-4 sm:p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="overflow-hidden rounded-3xl border border-pk-border bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="max-w-2xl">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-pk-mutedText">
                Peskids / Formularios
              </p>
              <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-pk-ink sm:text-3xl">
                Crear forma
              </h1>
              <p className="mt-2 max-w-xl text-sm leading-6 text-pk-sub">
                Diseña formularios para estudiantes y familias. Agrega campos, personaliza las
                preguntas y guárdalos para empezar a recibir respuestas.
              </p>
            </div>
            <Button variant="ghost" onClick={() => router.push('/teacher/dashboard')}>
              Volver al dashboard
            </Button>
          </div>
        </section>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {error}
          </div>
        )}

        <FormBuilder onSave={handleSave} isLoading={saving} />
      </div>
    </div>
  );
}
