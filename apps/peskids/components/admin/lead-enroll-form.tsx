'use client';

import { useMemo, useState } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import type { DashboardData } from '@/lib/types';
import { PESKIDS_CLASS_MODALITY_OPTIONS } from '@/lib/lead-modality';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';

type LeadRow = DashboardData['new_leads'][number];

type DuplicateCandidate = {
  id: string;
  name: string;
  parent_email: string | null;
  parent_phone: string | null;
  status: string;
};

type LeadEnrollFormProps = {
  lead: LeadRow;
  leadId: string;
  busy: boolean;
  onBusyChange: (busy: boolean) => void;
  onFeedback: (message: string) => void;
  onCompleted: () => Promise<void> | void;
};

type EnrollDraft = {
  child_name: string;
  grade: string;
  parent_email: string;
  parent_phone: string;
  program: string;
  class_modality: (typeof PESKIDS_CLASS_MODALITY_OPTIONS)[number]['value'] | '';
  teacher_name: string;
  schedule_label: string;
  enrollment_date: string;
  enrollment_status: 'active' | 'inactive';
  consent_confirmed: boolean;
  notes: string;
};

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function draftFromLead(lead: LeadRow): EnrollDraft {
  return {
    child_name: lead.name,
    grade: lead.grade_interested,
    parent_email: lead.email,
    parent_phone: lead.phone ?? '',
    program: 'Peskids',
    class_modality: lead.class_modality ?? 'llanogrande',
    teacher_name: '',
    schedule_label: '',
    enrollment_date: todayDate(),
    enrollment_status: 'active',
    consent_confirmed: false,
    notes: '',
  };
}

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const json = (await response.json()) as { error?: string; message?: string };
    return json.message || json.error || fallback;
  } catch {
    return fallback;
  }
}

export function LeadEnrollForm({
  lead,
  leadId,
  busy,
  onBusyChange,
  onFeedback,
  onCompleted,
}: LeadEnrollFormProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<EnrollDraft>(() => draftFromLead(lead));
  const [duplicates, setDuplicates] = useState<DuplicateCandidate[]>([]);

  const canSubmit = useMemo(
    () =>
      draft.child_name.trim().length >= 2 &&
      draft.grade.trim().length > 0 &&
      draft.parent_email.includes('@') &&
      draft.consent_confirmed &&
      draft.enrollment_date.length === 10,
    [draft]
  );

  const submit = async (force: boolean) => {
    if (!canSubmit && !force) {
      onFeedback('Completa los datos requeridos y confirma el consentimiento.');
      return;
    }
    onBusyChange(true);
    onFeedback('');
    try {
      const response = await fetch(`/api/admin/leads/${leadId}/convert`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_name: draft.child_name.trim(),
          grade: draft.grade.trim(),
          parent_email: draft.parent_email.trim(),
          parent_phone: draft.parent_phone.trim() || null,
          program: draft.program.trim() || undefined,
          class_modality: draft.class_modality || null,
          teacher_name: draft.teacher_name.trim() || null,
          schedule_label: draft.schedule_label.trim() || null,
          enrollment_date: draft.enrollment_date,
          enrollment_status: draft.enrollment_status,
          consent_confirmed: draft.consent_confirmed,
          notes: draft.notes.trim() || null,
          force,
        }),
      });

      const json = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        duplicates?: DuplicateCandidate[];
        student?: { id: string; name: string };
      };

      if (response.status === 409 || json.error === 'duplicate_candidates') {
        setDuplicates(json.duplicates ?? []);
        onFeedback(
          json.message ||
            'Hay posibles duplicados. Revisa la lista y confirma para forzar la matrícula.'
        );
        return;
      }

      if (!response.ok || json.ok === false) {
        throw new Error(json.message || json.error || (await readApiError(response, 'No se pudo matricular')));
      }

      setDuplicates([]);
      setOpen(false);
      onFeedback(
        json.student
          ? `Matrícula lista: ${json.student.name}. Lead e CRM actualizados.`
          : 'Matrícula completada.'
      );
      await onCompleted();
    } catch (err) {
      onFeedback(err instanceof Error ? err.message : 'Error al matricular');
    } finally {
      onBusyChange(false);
    }
  };

  if (!open) {
    return (
      <Button
        type="button"
        size="sm"
        disabled={busy || lead.status === 'enrolled' || lead.status === 'active'}
        onClick={() => {
          setDraft(draftFromLead(lead));
          setDuplicates([]);
          setOpen(true);
        }}
      >
        <UserPlus className="mr-1.5 h-4 w-4" aria-hidden />
        Matricular estudiante
      </Button>
    );
  }

  return (
    <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-4">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-pk-ink">Matricular estudiante</p>
          <p className="mt-0.5 text-xs text-pk-sub">
            Reutiliza los datos del interesado. Confirma acudiente, programa y consentimiento.
          </p>
        </div>
        <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
          Cerrar
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre del niño">
          <Input
            value={draft.child_name}
            onChange={(e) => setDraft((d) => ({ ...d, child_name: e.target.value }))}
            disabled={busy}
          />
        </Field>
        <Field label="Edad / grado">
          <Input
            value={draft.grade}
            onChange={(e) => setDraft((d) => ({ ...d, grade: e.target.value }))}
            disabled={busy}
          />
        </Field>
        <Field label="Email acudiente">
          <Input
            type="email"
            value={draft.parent_email}
            onChange={(e) => setDraft((d) => ({ ...d, parent_email: e.target.value }))}
            disabled={busy}
          />
        </Field>
        <Field label="Teléfono acudiente">
          <Input
            value={draft.parent_phone}
            onChange={(e) => setDraft((d) => ({ ...d, parent_phone: e.target.value }))}
            disabled={busy}
          />
        </Field>
        <Field label="Programa">
          <Input
            value={draft.program}
            onChange={(e) => setDraft((d) => ({ ...d, program: e.target.value }))}
            disabled={busy}
          />
        </Field>
        <Field label="Modalidad / grupo">
          <select
            className="pk-input"
            value={draft.class_modality}
            disabled={busy}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                class_modality: e.target.value as EnrollDraft['class_modality'],
              }))
            }
          >
            {PESKIDS_CLASS_MODALITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Profesor (opcional)">
          <Input
            value={draft.teacher_name}
            onChange={(e) => setDraft((d) => ({ ...d, teacher_name: e.target.value }))}
            disabled={busy}
            placeholder="Nombre del profesor"
          />
        </Field>
        <Field label="Horario (opcional)">
          <Input
            value={draft.schedule_label}
            onChange={(e) => setDraft((d) => ({ ...d, schedule_label: e.target.value }))}
            disabled={busy}
            placeholder="Ej. Mar/Jue 4:00 pm"
          />
        </Field>
        <Field label="Fecha de inicio">
          <Input
            type="date"
            value={draft.enrollment_date}
            onChange={(e) => setDraft((d) => ({ ...d, enrollment_date: e.target.value }))}
            disabled={busy}
          />
        </Field>
        <Field label="Estado de matrícula">
          <select
            className="pk-input"
            value={draft.enrollment_status}
            disabled={busy}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                enrollment_status: e.target.value as 'active' | 'inactive',
              }))
            }
          >
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Notas">
            <Input
              value={draft.notes}
              onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))}
              disabled={busy}
            />
          </Field>
        </div>
      </div>

      <label className="mt-3 flex items-start gap-2 text-sm text-pk-ink">
        <input
          type="checkbox"
          className="mt-1"
          checked={draft.consent_confirmed}
          disabled={busy}
          onChange={(e) => setDraft((d) => ({ ...d, consent_confirmed: e.target.checked }))}
        />
        <span>
          Confirmo el consentimiento del acudiente para matricular y conservar el historial del
          interesado.
        </span>
      </label>

      {duplicates.length > 0 ? (
        <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-900">
            Posibles duplicados
          </p>
          <ul className="mt-2 space-y-1">
            {duplicates.map((dup) => (
              <li key={dup.id} className="flex flex-wrap items-center gap-2 text-xs text-pk-ink">
                <span className="font-medium">{dup.name}</span>
                <span className="text-pk-sub">{dup.parent_email ?? 'sin email'}</span>
                <Badge tone="amber">{dup.status}</Badge>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={busy || !canSubmit} onClick={() => void submit(false)}>
          {busy ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden /> : null}
          Confirmar matrícula
        </Button>
        {duplicates.length > 0 ? (
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy || !canSubmit}
            onClick={() => void submit(true)}
          >
            Forzar matrícula nueva
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div>
      <Label className="text-xs text-pk-sub">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}
