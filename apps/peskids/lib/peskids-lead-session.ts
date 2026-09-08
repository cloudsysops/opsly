/** Client session flag: public lead captured before opening WhatsApp. */

import { ageYearsFromBirthDate } from '@/lib/lead-age';

export const PESKIDS_LEAD_SESSION_KEY = 'peskids_public_lead';

export type PeskidsLeadSession = {
  name: string;
  capturedAt: string;
  /** Family modality chosen in the form — routes WhatsApp without asking again. */
  class_modality?: 'llanogrande' | 'domicilio' | null;
  lead_type?: string | null;
  lead_id?: string | null;
  email?: string | null;
  phone?: string | null;
  child_name?: string | null;
  birth_date?: string | null;
  document_number?: string | null;
  neighborhood?: string | null;
  grade_interested?: string | null;
  company_name?: string | null;
  company_nit?: string | null;
  contact_role?: string | null;
  need?: string | null;
  experience?: string | null;
  availability?: string | null;
  work_zones?: string | null;
};

export type PostLeadWhatsAppPrefillOptions = {
  class_modality?: string | null;
  lead_type?: string | null;
  lead_id?: string | null;
  email?: string | null;
  phone?: string | null;
  child_name?: string | null;
  birth_date?: string | null;
  document_number?: string | null;
  neighborhood?: string | null;
  grade_interested?: string | null;
  company_name?: string | null;
  company_nit?: string | null;
  contact_role?: string | null;
  need?: string | null;
  experience?: string | null;
  availability?: string | null;
  work_zones?: string | null;
  /** Override public site base (tests). Defaults to production peskids.com. */
  siteBaseUrl?: string | null;
};

function trimOrNull(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

/** Public site URL for links in WhatsApp (always production-facing for support). */
export function peskidsPublicSiteBaseUrl(override?: string | null): string {
  const fromOverride = trimOrNull(override);
  if (fromOverride) return fromOverride.replace(/\/$/, '');
  const fromEnv =
    trimOrNull(process.env.NEXT_PUBLIC_PESKIDS_URL) ||
    trimOrNull(process.env.NEXT_PUBLIC_PESKIDS_SITE_URL) ||
    trimOrNull(process.env.NEXT_PUBLIC_SITE_URL);
  if (fromEnv && !/localhost|127\.0\.0\.1/i.test(fromEnv)) {
    return fromEnv.replace(/\/$/, '');
  }
  return 'https://www.peskids.com';
}

/** Canonical admin lead detail for soporte validation. */
export function buildAdminLeadValidationUrl(
  leadId: string,
  siteBaseUrl?: string | null
): string {
  const id = leadId.trim();
  return `${peskidsPublicSiteBaseUrl(siteBaseUrl)}/admin/interesados/${encodeURIComponent(id)}`;
}

function modalityLabel(modality: string | null | undefined): string | null {
  if (modality === 'domicilio') return 'Clases a domicilio';
  if (modality === 'llanogrande') return 'Sede Llanogrande';
  return null;
}

function teacherApplicantSummaryLines(options?: PostLeadWhatsAppPrefillOptions): string[] {
  const experience = trimOrNull(options?.experience);
  const availability = trimOrNull(options?.availability);
  const workZones = trimOrNull(options?.work_zones);
  const lines = ['🏊 Interesado en trabajar como profesor'];
  if (experience) lines.push(`💼 Experiencia: ${experience}`);
  if (availability) lines.push(`🕒 Disponibilidad: ${availability}`);
  if (workZones) lines.push(`📍 Zonas: ${workZones}`);
  return lines;
}

function companySummaryLines(options?: PostLeadWhatsAppPrefillOptions): string[] {
  const companyName = trimOrNull(options?.company_name);
  const companyNit = trimOrNull(options?.company_nit);
  const contactRole = trimOrNull(options?.contact_role);
  const need = trimOrNull(options?.need);
  const lines = [`🏢 Institución: ${companyName ?? 'No indicada'}`];
  if (companyNit) lines.push(`🧾 NIT: ${companyNit}`);
  if (contactRole) lines.push(`👔 Cargo: ${contactRole}`);
  if (need) lines.push(`📝 Necesidad: ${need}`);
  return lines;
}

function familySummaryLines(options?: PostLeadWhatsAppPrefillOptions): string[] {
  const modality = modalityLabel(options?.class_modality);
  const childName = trimOrNull(options?.child_name);
  const birthDate = trimOrNull(options?.birth_date);
  const age = birthDate ? ageYearsFromBirthDate(birthDate) : null;
  const documentNumber = trimOrNull(options?.document_number);
  const neighborhood = trimOrNull(options?.neighborhood);
  const lines: string[] = [];
  if (age !== null) lines.push(`👧 Edad del niño: ${age} ${age === 1 ? 'año' : 'años'}`);
  if (modality) lines.push(`🏊 Modalidad: ${modality}`);
  if (childName) lines.push(`👶 Niño/a: ${childName}`);
  if (birthDate) lines.push(`🎂 Fecha de nacimiento: ${birthDate}`);
  if (documentNumber) lines.push(`🧾 Cédula del acudiente: ${documentNumber}`);
  if (neighborhood) lines.push(`📍 Barrio / zona: ${neighborhood}`);
  return lines;
}

function summaryLines(leadType: string | null, options?: PostLeadWhatsAppPrefillOptions): string[] {
  if (leadType === 'teacher_applicant') return teacherApplicantSummaryLines(options);
  if (leadType === 'company') return companySummaryLines(options);
  return familySummaryLines(options);
}

/**
 * Prefill text the client sends to Peskids support on WhatsApp/email after the form.
 * Includes a short form summary and an authenticated admin link for the lead.
 */
export function buildPostLeadWhatsAppPrefill(
  name: string,
  options?: PostLeadWhatsAppPrefillOptions
): string {
  const trimmed = name.trim() || 'familia';
  const leadType = trimOrNull(options?.lead_type);
  const email = trimOrNull(options?.email);
  const phone = trimOrNull(options?.phone);
  const leadId = trimOrNull(options?.lead_id);

  const lines: string[] = [`Hola Peskids, mi nombre es ${trimmed}.`, ''];

  if (email) lines.push(`📧 Email: ${email}`);
  if (phone) lines.push(`📞 Teléfono: ${phone}`);
  lines.push(...summaryLines(leadType, options));

  if (leadId) {
    lines.push('');
    lines.push(`🔗 Abrir lead en Peskids: ${buildAdminLeadValidationUrl(leadId, options?.siteBaseUrl)}`);
  }

  return lines.join('\n');
}

export function parsePeskidsLeadSession(raw: string | null): PeskidsLeadSession | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('name' in parsed) ||
      typeof (parsed as PeskidsLeadSession).name !== 'string' ||
      (parsed as PeskidsLeadSession).name.trim().length < 2
    ) {
      return null;
    }
    const session = parsed as PeskidsLeadSession;
    const modality =
      session.class_modality === 'llanogrande' || session.class_modality === 'domicilio'
        ? session.class_modality
        : null;
    return {
      name: session.name.trim(),
      capturedAt: session.capturedAt ?? '',
      class_modality: modality,
      lead_type: typeof session.lead_type === 'string' ? session.lead_type : null,
      lead_id: typeof session.lead_id === 'string' ? session.lead_id : null,
      email: typeof session.email === 'string' ? session.email : null,
      phone: typeof session.phone === 'string' ? session.phone : null,
      child_name: typeof session.child_name === 'string' ? session.child_name : null,
      birth_date: typeof session.birth_date === 'string' ? session.birth_date : null,
      document_number:
        typeof session.document_number === 'string' ? session.document_number : null,
      neighborhood: typeof session.neighborhood === 'string' ? session.neighborhood : null,
      grade_interested:
        typeof session.grade_interested === 'string' ? session.grade_interested : null,
      company_name: typeof session.company_name === 'string' ? session.company_name : null,
      company_nit: typeof session.company_nit === 'string' ? session.company_nit : null,
      contact_role: typeof session.contact_role === 'string' ? session.contact_role : null,
      need: typeof session.need === 'string' ? session.need : null,
      experience: typeof session.experience === 'string' ? session.experience : null,
      availability: typeof session.availability === 'string' ? session.availability : null,
      work_zones: typeof session.work_zones === 'string' ? session.work_zones : null,
    };
  } catch {
    return null;
  }
}

export function readPeskidsLeadSession(): PeskidsLeadSession | null {
  if (typeof window === 'undefined') return null;
  return parsePeskidsLeadSession(window.sessionStorage.getItem(PESKIDS_LEAD_SESSION_KEY));
}

export function writePeskidsLeadSession(
  name: string,
  options?: PostLeadWhatsAppPrefillOptions & {
    class_modality?: 'llanogrande' | 'domicilio' | null;
  }
): void {
  if (typeof window === 'undefined') return;
  const trimmed = name.trim();
  if (trimmed.length < 2) return;
  const modality =
    options?.class_modality === 'llanogrande' || options?.class_modality === 'domicilio'
      ? options.class_modality
      : null;
  const payload: PeskidsLeadSession = {
    name: trimmed,
    capturedAt: new Date().toISOString(),
    class_modality: modality,
    lead_type: trimOrNull(options?.lead_type),
    lead_id: trimOrNull(options?.lead_id),
    email: trimOrNull(options?.email),
    phone: trimOrNull(options?.phone),
    child_name: trimOrNull(options?.child_name),
    birth_date: trimOrNull(options?.birth_date),
    document_number: trimOrNull(options?.document_number),
    neighborhood: trimOrNull(options?.neighborhood),
    grade_interested: trimOrNull(options?.grade_interested),
    company_name: trimOrNull(options?.company_name),
    company_nit: trimOrNull(options?.company_nit),
    contact_role: trimOrNull(options?.contact_role),
    need: trimOrNull(options?.need),
    experience: trimOrNull(options?.experience),
    availability: trimOrNull(options?.availability),
    work_zones: trimOrNull(options?.work_zones),
  };
  window.sessionStorage.setItem(PESKIDS_LEAD_SESSION_KEY, JSON.stringify(payload));
}

/** Prefill from a stored public-lead session (gated WhatsApp CTAs). */
export function buildPostLeadWhatsAppPrefillFromSession(session: PeskidsLeadSession): string {
  return buildPostLeadWhatsAppPrefill(session.name, {
    class_modality: session.class_modality,
    lead_type: session.lead_type,
    lead_id: session.lead_id,
    email: session.email,
    phone: session.phone,
    child_name: session.child_name,
    birth_date: session.birth_date,
    document_number: session.document_number,
    neighborhood: session.neighborhood,
    grade_interested: session.grade_interested,
    company_name: session.company_name,
    company_nit: session.company_nit,
    contact_role: session.contact_role,
    need: session.need,
    experience: session.experience,
    availability: session.availability,
    work_zones: session.work_zones,
  });
}
