/** Client session flag: public lead captured before opening WhatsApp. */

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
  neighborhood?: string | null;
  grade_interested?: string | null;
  company_name?: string | null;
};

export type PostLeadWhatsAppPrefillOptions = {
  class_modality?: string | null;
  lead_type?: string | null;
  lead_id?: string | null;
  email?: string | null;
  phone?: string | null;
  child_name?: string | null;
  neighborhood?: string | null;
  grade_interested?: string | null;
  company_name?: string | null;
  /** Override public site base (tests). Defaults to production peskids.com. */
  siteBaseUrl?: string | null;
};

const LEAD_TYPE_LABELS: Record<string, string> = {
  family: 'Familia / Alumno',
  teacher_applicant: 'Profesor(a)',
  company: 'Empresa / institución',
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

/**
 * Prefill text the client sends to Peskids support on WhatsApp after the form.
 * Includes a short form summary and the admin lead link when `lead_id` is known.
 */
export function buildPostLeadWhatsAppPrefill(
  name: string,
  options?: PostLeadWhatsAppPrefillOptions
): string {
  const trimmed = name.trim() || 'familia';
  const leadType = trimOrNull(options?.lead_type);
  const modality = modalityLabel(options?.class_modality);
  const email = trimOrNull(options?.email);
  const phone = trimOrNull(options?.phone);
  const childName = trimOrNull(options?.child_name);
  const neighborhood = trimOrNull(options?.neighborhood);
  const grade = trimOrNull(options?.grade_interested);
  const companyName = trimOrNull(options?.company_name);
  const leadId = trimOrNull(options?.lead_id);

  const lines: string[] = [
    `Hola Peskids 👋 Soy ${trimmed}, acabo de completar el formulario de solicitud en la web.`,
    '',
    '📋 Resumen de mi solicitud:',
  ];

  if (leadType) {
    lines.push(`• Tipo: ${LEAD_TYPE_LABELS[leadType] ?? leadType}`);
  }
  if (email) lines.push(`• Email: ${email}`);
  if (phone) lines.push(`• Teléfono: ${phone}`);
  if (modality) lines.push(`• Modalidad: ${modality}`);
  if (neighborhood) lines.push(`• Barrio / zona: ${neighborhood}`);
  if (childName) lines.push(`• Niño/a: ${childName}`);
  if (grade) lines.push(`• Grado / nivel: ${grade}`);
  if (companyName) lines.push(`• Empresa / institución: ${companyName}`);

  if (leadType === 'teacher_applicant' && !companyName) {
    lines.push('• Completé el formulario de profesor(a).');
  }

  if (leadId) {
    lines.push('');
    lines.push(`🔗 Lead para soporte (validar en panel):`);
    lines.push(buildAdminLeadValidationUrl(leadId, options?.siteBaseUrl));
  }

  lines.push('');
  lines.push('¿Me pueden orientar?');
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
      neighborhood: typeof session.neighborhood === 'string' ? session.neighborhood : null,
      grade_interested:
        typeof session.grade_interested === 'string' ? session.grade_interested : null,
      company_name: typeof session.company_name === 'string' ? session.company_name : null,
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
    neighborhood: trimOrNull(options?.neighborhood),
    grade_interested: trimOrNull(options?.grade_interested),
    company_name: trimOrNull(options?.company_name),
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
    neighborhood: session.neighborhood,
    grade_interested: session.grade_interested,
    company_name: session.company_name,
  });
}
