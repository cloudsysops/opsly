/** Client session flag: public lead captured before opening WhatsApp. */

export const PESKIDS_LEAD_SESSION_KEY = 'peskids_public_lead';

export type PeskidsLeadSession = {
  name: string;
  capturedAt: string;
  /** Family modality chosen in the form — routes WhatsApp without asking again. */
  class_modality?: 'llanogrande' | 'domicilio' | null;
  lead_type?: string | null;
};

export function buildPostLeadWhatsAppPrefill(
  name: string,
  options?: { class_modality?: string | null; lead_type?: string | null }
): string {
  const trimmed = name.trim();
  const modality =
    options?.class_modality === 'domicilio'
      ? 'a domicilio'
      : options?.class_modality === 'llanogrande'
        ? 'en sede Llanogrande'
        : null;
  const modalityBit = modality ? ` Quiero orientación ${modality}.` : '';
  const typeBit =
    options?.lead_type === 'teacher_applicant'
      ? ' Completé el formulario de profesor(a).'
      : options?.lead_type === 'company'
        ? ' Completé el formulario de empresa/institución.'
        : '';
  return `Hola Peskids 👋 Soy ${trimmed}, acabo de completar el formulario de solicitud en la web.${typeBit}${modalityBit} ¿Me pueden orientar?`;
}

export function parsePeskidsLeadSession(raw: string | null): PeskidsLeadSession | null {
  if (!raw?.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'name' in parsed &&
      typeof (parsed as PeskidsLeadSession).name === 'string' &&
      (parsed as PeskidsLeadSession).name.trim().length >= 2
    ) {
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
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function readPeskidsLeadSession(): PeskidsLeadSession | null {
  if (typeof window === 'undefined') return null;
  return parsePeskidsLeadSession(window.sessionStorage.getItem(PESKIDS_LEAD_SESSION_KEY));
}

export function writePeskidsLeadSession(
  name: string,
  options?: {
    class_modality?: 'llanogrande' | 'domicilio' | null;
    lead_type?: string | null;
  }
): void {
  if (typeof window === 'undefined') return;
  const trimmed = name.trim();
  if (trimmed.length < 2) return;
  const payload: PeskidsLeadSession = {
    name: trimmed,
    capturedAt: new Date().toISOString(),
    class_modality: options?.class_modality ?? null,
    lead_type: options?.lead_type ?? null,
  };
  window.sessionStorage.setItem(PESKIDS_LEAD_SESSION_KEY, JSON.stringify(payload));
}
