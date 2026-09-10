import { createHash } from 'node:crypto';
import { emitEvent } from '@/lib/events';
import {
  convertLeadToStudent,
  LeadConvertDuplicateError,
} from '@/lib/services/lead-conversion.service';
import type { PeskidsEnrollmentForm } from '@/lib/validation/enrollment-form.schema';
import { peskidsEnrollmentFormSchema } from '@/lib/validation/enrollment-form.schema';
import { appendEnrollmentTimeline, withEnrollmentAccess } from './metadata';
import { resolveEnrollmentToken } from './resolve';
import { ENROLLMENT_LINK_UNAVAILABLE, ENROLLMENT_TOKEN_TENANT } from './token';
import type { EnrollmentLeadMetadata, EnrollmentOutcome, EnrollmentTimelineKind } from './types';
import type { EnrollmentLeadStore } from './store';

export type EnrollmentSubmitResult =
  | {
      ok: true;
      already_submitted: boolean;
      lead_id: string;
      student_id: string;
      family_ref: string;
      family_link: 'created' | 'linked';
      student_link: 'created' | 'linked';
      next_action: 'PREPARE_FIRST_CLASS';
    }
  | { ok: false; error: string; status: number };

function familyRefFromEmail(email: string): string {
  const digest = createHash('sha256').update(email.trim().toLowerCase(), 'utf8').digest('hex');
  return `fam_${digest.slice(0, 16)}`;
}

function guardianFullName(form: PeskidsEnrollmentForm): string {
  return `${form.guardian.first_name} ${form.guardian.last_name}`.trim();
}

async function emitSafe(kind: EnrollmentTimelineKind, data: Record<string, string>): Promise<void> {
  await emitEvent(kind, data).catch(() => undefined);
}

function successFromOutcome(
  leadId: string,
  outcome: EnrollmentOutcome,
  already: boolean
): Extract<EnrollmentSubmitResult, { ok: true }> {
  return {
    ok: true,
    already_submitted: already,
    lead_id: leadId,
    student_id: outcome.student.student_id,
    family_ref: outcome.family.family_ref,
    family_link: outcome.family.link,
    student_link: outcome.student.link,
    next_action: 'PREPARE_FIRST_CLASS',
  };
}

export async function submitEnrollmentForm(input: {
  store: EnrollmentLeadStore;
  rawToken: string;
  body: unknown;
  now?: Date;
  requestId?: string;
}): Promise<EnrollmentSubmitResult> {
  const parsed = peskidsEnrollmentFormSchema.safeParse(input.body);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid form', status: 400 };
  }

  const resolved = await resolveEnrollmentToken({
    store: input.store,
    rawToken: input.rawToken,
    mode: 'submit',
    now: input.now,
    requestId: input.requestId,
  });
  if (!resolved.ok) {
    return { ok: false, error: ENROLLMENT_LINK_UNAVAILABLE, status: 404 };
  }

  const existing = resolved.lead.metadata.enrollment_outcome;
  if (resolved.already_submitted && existing) {
    return successFromOutcome(resolved.lead.id, existing, true);
  }

  const form = parsed.data;
  const requestId = form.request_id ?? input.requestId ?? null;

  try {
    const converted = await convertLeadToStudent(resolved.lead.id, ENROLLMENT_TOKEN_TENANT, {
      child_name: form.student.first_name,
      grade: form.student.age_range,
      parent_email: form.guardian.email,
      parent_phone: form.guardian.phone,
      program: form.program.interest ?? 'natacion',
      class_modality: form.program.modality,
      schedule_label: form.operational.preferred_schedule ?? null,
      consent_confirmed: true,
      notes: `Matrícula pública. Unidad: ${form.program.unit ?? 'sin unidad'}. Acudiente: ${guardianFullName(form)}.`,
      force: true,
    });

    if (!converted) {
      return { ok: false, error: ENROLLMENT_LINK_UNAVAILABLE, status: 404 };
    }

    const nowIso = (input.now ?? new Date()).toISOString();
    const familyLink = converted.created ? 'created' : 'linked';
    const outcome: EnrollmentOutcome = {
      lead_id: resolved.lead.id,
      family: { link: familyLink, family_ref: familyRefFromEmail(form.guardian.email) },
      student: { link: converted.created ? 'created' : 'linked', student_id: converted.student.id },
      source: resolved.lead.referral_source,
      campaign: resolved.lead.metadata.campaign ?? null,
      request_id: requestId,
      enrolled_at: nowIso,
    };

    const access = resolved.lead.metadata.enrollment_access;
    const usedAccess = access ? { ...access, used_at: nowIso } : undefined;
    let metadata: EnrollmentLeadMetadata = {
      ...resolved.lead.metadata,
      enrollment_outcome: outcome,
      first_class: { status: 'pending' },
    };
    if (usedAccess) {
      metadata = withEnrollmentAccess(metadata, usedAccess);
    }
    const events: EnrollmentTimelineKind[] = [
      'enrollment.form.submitted',
      familyLink === 'created' ? 'family.created' : 'family.linked',
      converted.created ? 'student.created' : 'student.linked',
      'student.enrolled',
    ];
    for (const kind of events) {
      metadata = appendEnrollmentTimeline(metadata, kind, nowIso, requestId ?? undefined);
    }
    await input.store.saveMetadata(resolved.lead.id, ENROLLMENT_TOKEN_TENANT, metadata);

    void emitSafe('enrollment.form.submitted', {
      lead_id: resolved.lead.id,
      student_id: converted.student.id,
      enrollment_id: converted.student.id,
    });

    return successFromOutcome(resolved.lead.id, outcome, false);
  } catch (error) {
    if (error instanceof LeadConvertDuplicateError) {
      return { ok: false, error: ENROLLMENT_LINK_UNAVAILABLE, status: 404 };
    }
    throw error;
  }
}
