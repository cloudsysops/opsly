'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { FormSubmission } from '@/components/forms/form-submission';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { Form, FormSubmission as SubmissionPayload } from '@/lib/form-types';

export default function FamilyFormPage(): React.ReactElement {
  const params = useParams<{ formId: string }>();
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void (async () => {
      try {
        const formId = encodeURIComponent(params.formId);
        const response = await fetch(`/api/forms/${formId}`, { credentials: 'include' });
        if (response.status === 401 || response.status === 403) {
          router.replace(
            `/familias/login?next=${encodeURIComponent(`/familias/forms/${params.formId}`)}`
          );
          return;
        }
        if (!response.ok) {
          throw new Error(
            response.status === 404
              ? 'Este formulario no está disponible.'
              : 'No se pudo cargar el formulario.'
          );
        }

        const payload = (await response.json()) as { form?: Form };
        if (!payload.form) throw new Error('El formulario no tiene datos.');
        setForm(payload.form);
      } catch (loadError) {
        setError(
          loadError instanceof Error ? loadError.message : 'No se pudo cargar el formulario.'
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [params.formId, router]);

  const submitForm = async (submission: SubmissionPayload): Promise<void> => {
    setSubmitting(true);
    try {
      const response = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          formId: submission.formId,
          data: submission.data,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(payload.error ?? 'No se pudo guardar tu respuesta.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-pk-bg px-4 py-10">
      <div className="mx-auto max-w-3xl space-y-6">
        {loading ? (
          <div className="flex items-center gap-2 py-12 text-pk-sub">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Cargando formulario…
          </div>
        ) : error ? (
          <Card>
            <CardHeader>
              <CardTitle>Formulario no disponible</CardTitle>
              <CardDescription>{error}</CardDescription>
            </CardHeader>
          </Card>
        ) : form ? (
          <div className="rounded-3xl border border-pk-border bg-pk-surface p-5 shadow-card sm:p-8">
            <FormSubmission form={form} onSubmit={submitForm} isLoading={submitting} />
          </div>
        ) : null}

        <Link href="/familias/forms">
          <Button variant="ghost">Volver a formularios</Button>
        </Link>
      </div>
    </main>
  );
}
