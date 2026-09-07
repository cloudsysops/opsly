'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PESKIDS_CLASS_MODALITIES, PESKIDS_GRADE_LEVELS } from '@/lib/validation/lead.schema';

type EnrollmentFormProps = {
  token: string;
};

type FormState = {
  guardian_first_name: string;
  guardian_last_name: string;
  email: string;
  phone: string;
  student_first_name: string;
  age_range: (typeof PESKIDS_GRADE_LEVELS)[number] | '';
  modality: (typeof PESKIDS_CLASS_MODALITIES)[number] | '';
  unit: string;
  preferred_schedule: string;
  enrollment_confirmed: boolean;
  privacy_accepted: boolean;
};

const emptyForm: FormState = {
  guardian_first_name: '',
  guardian_last_name: '',
  email: '',
  phone: '',
  student_first_name: '',
  age_range: '',
  modality: '',
  unit: '',
  preferred_schedule: '',
  enrollment_confirmed: false,
  privacy_accepted: false,
};

export function EnrollmentPublicForm({ token }: EnrollmentFormProps): React.ReactElement {
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    let cancelled = false;
    const load = async (): Promise<void> => {
      try {
        const response = await fetch(`/api/public/matricula/${encodeURIComponent(token)}`, {
          cache: 'no-store',
        });
        if (!response.ok) {
          if (!cancelled) setDenied(true);
          return;
        }
        const payload = (await response.json()) as { already_submitted?: boolean };
        if (!cancelled && payload.already_submitted) {
          setAlreadySubmitted(true);
        }
      } catch {
        if (!cancelled) setDenied(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleSubmit = async (event: React.FormEvent): Promise<void> => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/public/matricula/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          guardian: {
            first_name: form.guardian_first_name,
            last_name: form.guardian_last_name,
            email: form.email,
            phone: form.phone,
          },
          student: {
            first_name: form.student_first_name,
            age_range: form.age_range,
          },
          program: {
            modality: form.modality,
            unit: form.unit.trim() || undefined,
            interest: 'natacion',
          },
          operational: {
            preferred_schedule: form.preferred_schedule.trim() || undefined,
          },
          consents: {
            enrollment_confirmed: form.enrollment_confirmed,
            privacy_accepted: form.privacy_accepted,
          },
        }),
      });
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? 'No se pudo completar la matrícula');
      }
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar la matrícula');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-pk-sub">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden />
        Cargando…
      </div>
    );
  }

  if (denied) {
    return (
      <Card className="mx-auto max-w-lg border-pk-border">
        <CardHeader>
          <CardTitle>Enlace no disponible</CardTitle>
          <CardDescription>Pide un nuevo enlace de matrícula al equipo Peskids.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (done || alreadySubmitted) {
    return (
      <Card className="mx-auto max-w-lg border-pk-border">
        <CardHeader>
          <CardTitle>Matrícula recibida</CardTitle>
          <CardDescription>
            El equipo Peskids preparará la primera clase. No hace falta volver a enviar el formulario.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="mx-auto max-w-lg border-pk-border">
      <CardHeader>
        <CardTitle>Matrícula Peskids</CardTitle>
        <CardDescription>Solo pedimos los datos necesarios para matricular.</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="space-y-5" onSubmit={(event) => void handleSubmit(event)}>
          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-pk-ink">Acudiente</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label htmlFor="guardian-first">Nombre</Label>
                <Input
                  id="guardian-first"
                  value={form.guardian_first_name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, guardian_first_name: event.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="guardian-last">Apellido</Label>
                <Input
                  id="guardian-last"
                  value={form.guardian_last_name}
                  onChange={(event) =>
                    setForm((current) => ({ ...current, guardian_last_name: event.target.value }))
                  }
                  required
                />
              </div>
            </div>
            <div>
              <Label htmlFor="guardian-phone">Teléfono</Label>
              <Input
                id="guardian-phone"
                value={form.phone}
                onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="guardian-email">Correo</Label>
              <Input
                id="guardian-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                required
              />
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-pk-ink">Estudiante</legend>
            <div>
              <Label htmlFor="student-first">Nombre</Label>
              <Input
                id="student-first"
                value={form.student_first_name}
                onChange={(event) =>
                  setForm((current) => ({ ...current, student_first_name: event.target.value }))
                }
                required
              />
            </div>
            <div>
              <Label htmlFor="age-range">Rango de edad</Label>
              <select
                id="age-range"
                className="mt-1 w-full rounded-xl border border-pk-border bg-white px-3 py-2 text-sm"
                value={form.age_range}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    age_range: event.target.value as FormState['age_range'],
                  }))
                }
                required
              >
                <option value="">Selecciona</option>
                {PESKIDS_GRADE_LEVELS.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-sm font-semibold text-pk-ink">Matrícula</legend>
            <div>
              <Label htmlFor="modality">Sede / modalidad</Label>
              <select
                id="modality"
                className="mt-1 w-full rounded-xl border border-pk-border bg-white px-3 py-2 text-sm"
                value={form.modality}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    modality: event.target.value as FormState['modality'],
                  }))
                }
                required
              >
                <option value="">Selecciona</option>
                <option value="llanogrande">Llanogrande</option>
                <option value="domicilio">Domicilio</option>
              </select>
            </div>
            <div>
              <Label htmlFor="unit">Unidad / ubicación</Label>
              <Input
                id="unit"
                value={form.unit}
                onChange={(event) => setForm((current) => ({ ...current, unit: event.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="schedule">Horario preferido</Label>
              <Input
                id="schedule"
                value={form.preferred_schedule}
                onChange={(event) =>
                  setForm((current) => ({ ...current, preferred_schedule: event.target.value }))
                }
              />
            </div>
            <label className="flex items-start gap-2 text-sm text-pk-sub">
              <input
                type="checkbox"
                checked={form.enrollment_confirmed}
                onChange={(event) =>
                  setForm((current) => ({ ...current, enrollment_confirmed: event.target.checked }))
                }
                required
              />
              Confirmo que quiero matricular al estudiante.
            </label>
            <label className="flex items-start gap-2 text-sm text-pk-sub">
              <input
                type="checkbox"
                checked={form.privacy_accepted}
                onChange={(event) =>
                  setForm((current) => ({ ...current, privacy_accepted: event.target.checked }))
                }
                required
              />
              Acepto el tratamiento de datos para la matrícula.
            </label>
          </fieldset>

          {error ? <p className="text-sm text-rose-700">{error}</p> : null}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Enviando…' : 'Enviar matrícula'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
