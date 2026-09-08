import { firstName } from '@/lib/admin/support-reply-copy';

const FORBIDDEN_PROMISE = /precio|descuento|promoci[oó]n|cupo garantizado|gratis/i;

export function buildEnrollmentLinkDraft(input: {
  leadName: string;
  enrollmentUrl: string;
}): { template: 'ENROLLMENT_LINK'; message: string } {
  const name = firstName(input.leadName);
  const message = `Hola ${name}! Gracias por escribirnos a Peskids. Completa la matrícula en este enlace: ${input.enrollmentUrl} Cualquier duda nos escribes por aquí.`;
  if (FORBIDDEN_PROMISE.test(message)) {
    throw new Error('Enrollment WhatsApp draft must not invent commercial promises');
  }
  return { template: 'ENROLLMENT_LINK', message };
}
