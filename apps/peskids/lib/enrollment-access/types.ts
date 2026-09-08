import type { EnrollmentTokenPurpose } from './token';

export const ENROLLMENT_TIMELINE_KINDS = [
  'enrollment.link.created',
  'enrollment.link.opened',
  'enrollment.form.submitted',
  'family.created',
  'family.linked',
  'student.created',
  'student.linked',
  'student.enrolled',
  'whatsapp.draft.created',
  'whatsapp.opened',
  'whatsapp.sent_confirmed',
] as const;

export type EnrollmentTimelineKind = (typeof ENROLLMENT_TIMELINE_KINDS)[number];

export type EnrollmentAccessRecord = {
  token_hash: string;
  purpose: EnrollmentTokenPurpose;
  tenant_slug: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
  used_at: string | null;
  opened_at: string | null;
  policy: 'single_use_on_submit';
};

export type EnrollmentTimelineEntry = {
  at: string;
  kind: EnrollmentTimelineKind;
  request_id?: string;
};

export type EnrollmentFamilySnapshot = {
  link: 'created' | 'linked';
  family_ref: string;
};

export type EnrollmentStudentSnapshot = {
  link: 'created' | 'linked';
  student_id: string;
};

export type EnrollmentOutcome = {
  lead_id: string;
  family: EnrollmentFamilySnapshot;
  student: EnrollmentStudentSnapshot;
  source: string | null;
  campaign: string | null;
  request_id: string | null;
  enrolled_at: string;
};

export type FirstClassPending = {
  status: 'pending';
};

export type EnrollmentLeadMetadata = {
  enrollment_access?: EnrollmentAccessRecord;
  enrollment_timeline?: EnrollmentTimelineEntry[];
  enrollment_outcome?: EnrollmentOutcome;
  first_class?: FirstClassPending;
  campaign?: string;
  request_id?: string;
};

export type EnrollmentLeadRecord = {
  id: string;
  tenant_slug: string;
  status: string;
  metadata: EnrollmentLeadMetadata;
  referral_source: string | null;
  created_at: string | null;
};

export type TokenDenialReason =
  | 'invalid'
  | 'expired'
  | 'revoked'
  | 'wrong_purpose'
  | 'wrong_tenant'
  | 'replay';

export type TokenEvaluation =
  | { ok: true }
  | { ok: false; reason: TokenDenialReason };

export type EnrollmentStaffNextAction = 'SEND_ENROLLMENT_LINK' | 'PREPARE_FIRST_CLASS';
