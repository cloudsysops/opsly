import { supabaseServer } from '@/lib/supabase';
import type { Database } from '@/lib/types';
import { emitEvent } from '@/lib/events';
import { getLeadForAdmin, updateLeadForAdmin } from '@/lib/services/lead-admin.service';
import type { DashboardLead } from '@/lib/services/lead-admin.service';
import type { LeadConvertInput } from '@/lib/validation/lead-convert.schema';
import { classModalityLabel } from '@/lib/lead-modality';

type StudentRow = Database['public']['Tables']['students']['Row'];

export type ConvertLeadDuplicate = {
  id: string;
  name: string;
  parent_email: string | null;
  parent_phone: string | null;
  source_lead_id: string | null;
  status: StudentRow['status'];
};

export type ConvertLeadResult = {
  student: StudentRow;
  lead: DashboardLead;
  created: boolean;
  duplicates?: ConvertLeadDuplicate[];
};

export class LeadConvertValidationError extends Error {
  readonly code = 'validation_error';
  constructor(message: string) {
    super(message);
    this.name = 'LeadConvertValidationError';
  }
}

export class LeadConvertDuplicateError extends Error {
  readonly code = 'duplicate_candidates';
  readonly duplicates: ConvertLeadDuplicate[];
  constructor(duplicates: ConvertLeadDuplicate[]) {
    super('Possible duplicate students found');
    this.name = 'LeadConvertDuplicateError';
    this.duplicates = duplicates;
  }
}

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

async function findStudentBySourceLeadId(
  leadId: string,
  slug: string
): Promise<StudentRow | null> {
  const { data, error } = await supabaseServer()
    .from('students')
    .select('*')
    .eq('tenant_id', slug)
    .eq('source_lead_id', leadId)
    .maybeSingle();

  if (error) throw error;
  return data ?? null;
}

export async function findPossibleStudentDuplicates(input: {
  tenantSlug: string;
  childName: string;
  parentEmail: string | null;
  parentPhone: string | null;
  excludeSourceLeadId?: string;
}): Promise<ConvertLeadDuplicate[]> {
  const supabase = supabaseServer();
  const email = input.parentEmail?.trim().toLowerCase() || null;
  const phoneDigits = (input.parentPhone ?? '').replace(/\D+/g, '');
  const nameKey = normalizeName(input.childName);

  let query = supabase
    .from('students')
    .select('id, name, parent_email, parent_phone, source_lead_id, status')
    .eq('tenant_id', input.tenantSlug);

  if (email) {
    query = query.eq('parent_email', email);
  }

  const { data, error } = await query.limit(40);
  if (error) throw error;

  const rows = (data ?? []) as ConvertLeadDuplicate[];
  return rows.filter((row) => {
    if (
      input.excludeSourceLeadId &&
      row.source_lead_id &&
      row.source_lead_id === input.excludeSourceLeadId
    ) {
      return false;
    }
    const sameName = normalizeName(row.name) === nameKey;
    if (sameName) return true;
    if (!email && phoneDigits) {
      const rowDigits = (row.parent_phone ?? '').replace(/\D+/g, '');
      return Boolean(rowDigits && rowDigits === phoneDigits);
    }
    return false;
  });
}

function buildEnrollmentNotes(input: {
  lead: DashboardLead;
  options: LeadConvertInput;
}): string {
  const parts: string[] = ['Convertido desde interesado.'];
  if (input.options.program?.trim()) {
    parts.push(`Programa: ${input.options.program.trim()}.`);
  }
  const modality = input.options.class_modality ?? input.lead.class_modality;
  if (modality) {
    parts.push(`Modalidad: ${classModalityLabel(modality)}.`);
  }
  if (input.options.teacher_name?.trim()) {
    parts.push(`Profesor: ${input.options.teacher_name.trim()}.`);
  }
  if (input.options.schedule_label?.trim()) {
    parts.push(`Horario: ${input.options.schedule_label.trim()}.`);
  }
  if (input.options.class_id) {
    parts.push(`Grupo/clase: ${input.options.class_id}.`);
  }
  if (input.options.consent_confirmed) {
    parts.push('Consentimiento confirmado.');
  }
  if (input.options.notes?.trim()) {
    parts.push(input.options.notes.trim());
  } else if (input.lead.admin_notes?.trim()) {
    parts.push(input.lead.admin_notes.trim());
  }
  return parts.join(' ').slice(0, 500);
}

export async function convertLeadToStudent(
  leadId: string,
  slug: string = tenantSlug(),
  options: LeadConvertInput = {}
): Promise<ConvertLeadResult | null> {
  const lead = await getLeadForAdmin(leadId, slug);
  if (!lead) {
    return null;
  }

  const childName = (options.child_name ?? lead.name).trim();
  const grade = (options.grade ?? lead.grade_interested).trim();
  const parentEmail = (options.parent_email ?? lead.email).trim().toLowerCase();
  const parentPhone =
    options.parent_phone === undefined ? lead.phone : options.parent_phone;
  const enrollmentDate =
    options.enrollment_date ?? new Date().toISOString().slice(0, 10);
  const enrollmentStatus = options.enrollment_status ?? 'active';

  if (!childName || childName.length < 2) {
    throw new LeadConvertValidationError('Nombre del niño requerido');
  }
  if (!grade) {
    throw new LeadConvertValidationError('Grado / rango de edad requerido');
  }
  if (!parentEmail || !parentEmail.includes('@')) {
    throw new LeadConvertValidationError('Email del acudiente requerido');
  }

  // Explicit enroll form path requires consent; legacy one-click (empty body) skips.
  const hasExplicitForm =
    options.child_name !== undefined ||
    options.consent_confirmed !== undefined ||
    options.program !== undefined ||
    options.enrollment_date !== undefined;
  if (hasExplicitForm && options.consent_confirmed !== true) {
    throw new LeadConvertValidationError('Debes confirmar el consentimiento para matricular');
  }

  const existing = await findStudentBySourceLeadId(leadId, slug);
  if (existing) {
    const updatedLead = await updateLeadForAdmin(leadId, slug, { status: 'enrolled' });
    if (!updatedLead) {
      return null;
    }
    await emitStudentEnrolled({
      student: existing,
      lead: updatedLead,
      created: false,
      options,
    });
    return { student: existing, lead: updatedLead, created: false };
  }

  const duplicates = await findPossibleStudentDuplicates({
    tenantSlug: slug,
    childName,
    parentEmail,
    parentPhone,
    excludeSourceLeadId: leadId,
  });

  if (duplicates.length > 0 && !options.force) {
    throw new LeadConvertDuplicateError(duplicates);
  }

  const notes = buildEnrollmentNotes({ lead, options });

  const { data: student, error } = await supabaseServer()
    .from('students')
    .insert({
      tenant_id: slug,
      name: childName,
      grade,
      parent_email: parentEmail,
      parent_phone: parentPhone,
      notes,
      source_lead_id: leadId,
      enrollment_date: enrollmentDate,
      status: enrollmentStatus,
    })
    .select('*')
    .single();

  if (error) {
    // Unique race on source_lead_id → treat as idempotent success path.
    if (error.code === '23505') {
      const raced = await findStudentBySourceLeadId(leadId, slug);
      if (raced) {
        const updatedLead = await updateLeadForAdmin(leadId, slug, { status: 'enrolled' });
        if (!updatedLead) return null;
        return { student: raced, lead: updatedLead, created: false };
      }
    }
    throw error;
  }

  const updatedLead = await updateLeadForAdmin(leadId, slug, { status: 'enrolled' });
  if (!updatedLead) {
    // Compensation: keep student linked; surface failure for retry of lead status.
    console.error(
      JSON.stringify({
        component: 'peskids.lead_conversion',
        event: 'lead_status_update_failed',
        lead_id: leadId,
        student_id: student.id,
      })
    );
    throw new Error('Student created but lead status update failed');
  }

  await emitStudentEnrolled({
    student,
    lead: updatedLead,
    created: true,
    options,
  });

  console.info(
    JSON.stringify({
      component: 'peskids.lead_conversion',
      event: 'student.enrolled',
      lead_id: leadId,
      student_id: student.id,
      program: options.program ?? null,
      class_id: options.class_id ?? null,
      enrollment_date: enrollmentDate,
    })
  );

  return {
    student,
    lead: updatedLead,
    created: true,
    duplicates: duplicates.length > 0 ? duplicates : undefined,
  };
}

async function emitStudentEnrolled(input: {
  student: StudentRow;
  lead: DashboardLead;
  created: boolean;
  options: LeadConvertInput;
}): Promise<void> {
  await emitEvent('student.enrolled', {
    student_id: input.student.id,
    lead_id: input.lead.id,
    child_name: input.student.name,
    parent_email: input.student.parent_email,
    parent_phone: input.student.parent_phone,
    grade: input.student.grade,
    enrollment_date: input.student.enrollment_date,
    program: input.options.program ?? null,
    class_id: input.options.class_id ?? null,
    teacher_name: input.options.teacher_name ?? null,
    schedule_label: input.options.schedule_label ?? null,
    created: input.created,
    twenty_opportunity_id: input.lead.twenty_opportunity_id ?? null,
  });
}
