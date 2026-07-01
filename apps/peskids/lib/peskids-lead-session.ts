/** Client session flag: public lead captured before opening WhatsApp. */

export const PESKIDS_LEAD_SESSION_KEY = 'peskids_public_lead';

export type PeskidsLeadSession = {
  name: string;
  capturedAt: string;
};

export function buildPostLeadWhatsAppPrefill(name: string): string {
  const trimmed = name.trim();
  return `Hola Peskids 👋 Soy ${trimmed}, acabo de completar el formulario de reserva y estoy esperando poder agendar la clase de prueba.`;
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
      return { name: session.name.trim(), capturedAt: session.capturedAt ?? '' };
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

export function writePeskidsLeadSession(name: string): void {
  if (typeof window === 'undefined') return;
  const trimmed = name.trim();
  if (trimmed.length < 2) return;
  const payload: PeskidsLeadSession = {
    name: trimmed,
    capturedAt: new Date().toISOString(),
  };
  window.sessionStorage.setItem(PESKIDS_LEAD_SESSION_KEY, JSON.stringify(payload));
}
