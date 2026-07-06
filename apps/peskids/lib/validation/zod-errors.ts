import type { ZodError } from 'zod';

/** First human-readable validation message (Spanish defaults from schemas). */
export function firstZodErrorMessage(error: ZodError): string {
  return error.issues[0]?.message ?? 'Datos inválidos';
}

/** Map Zod issues to `{ fieldName: message }` for inline form errors. */
export function zodFieldErrors(error: ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === 'string' && !errors[key]) {
      errors[key] = issue.message;
    }
  }
  return errors;
}
