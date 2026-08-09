/**
 * Sanitize display cards — never leak emails / phones on global MC surfaces.
 */

export type SanitizedEntityCard = {
  id: string;
  title: string;
  subtitle: string;
  status: string;
  updatedAt: string | null;
};

export function sanitizeEntityCard(input: {
  id: string;
  title: string;
  subtitle?: string;
  status: string;
  updatedAt?: string | null;
  email?: string | null;
  phone?: string | null;
}): SanitizedEntityCard {
  void input.email;
  void input.phone;
  return {
    id: input.id,
    title: input.title.trim() || input.id,
    subtitle: (input.subtitle ?? '').trim(),
    status: input.status,
    updatedAt: input.updatedAt ?? null,
  };
}

export function redactPiiFromNotes(notes: string, maxLen = 160): string {
  const withoutEmail = notes.replace(
    /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,
    '[email]'
  );
  const withoutPhone = withoutEmail.replace(/\+?\d[\d\s()-]{7,}\d/g, '[phone]');
  const trimmed = withoutPhone.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}
