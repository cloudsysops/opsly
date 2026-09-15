import { PESKIDS_APP_ORIGIN } from '@/lib/app-url';

const IDENTIFIER_QUERY = /(?:lead|student|family)_id=/i;
const EMAIL_IN_URL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_IN_URL = /\+\d{7,}/;

export function enrollmentPublicPath(rawToken: string): string {
  return `/matricula/${encodeURIComponent(rawToken)}`;
}

export function buildEnrollmentPublicUrl(rawToken: string, origin = PESKIDS_APP_ORIGIN): string {
  return `${origin.replace(/\/$/, '')}${enrollmentPublicPath(rawToken)}`;
}

export function enrollmentUrlContainsPii(url: string): boolean {
  return IDENTIFIER_QUERY.test(url) || EMAIL_IN_URL.test(url) || PHONE_IN_URL.test(url);
}

export function assertEnrollmentUrlHasNoPii(url: string): void {
  if (enrollmentUrlContainsPii(url)) {
    throw new Error('Enrollment URL must not include PII or entity ids');
  }
}
