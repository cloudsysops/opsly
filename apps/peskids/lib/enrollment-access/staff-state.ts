import type { EnrollmentLeadMetadata, EnrollmentStaffNextAction } from './types';

export type EnrollmentStaffView = {
  state: 'none' | 'link_issued' | 'link_opened' | 'enrolled';
  expires_at: string | null;
  family_ref: string | null;
  family_link: 'created' | 'linked' | null;
  student_id: string | null;
  first_class: 'pending' | null;
  next_action: EnrollmentStaffNextAction;
};

export function enrollmentStaffViewFromMetadata(
  metadata: EnrollmentLeadMetadata
): EnrollmentStaffView {
  const outcome = metadata.enrollment_outcome;
  if (outcome) {
    return {
      state: 'enrolled',
      expires_at: metadata.enrollment_access?.expires_at ?? null,
      family_ref: outcome.family.family_ref,
      family_link: outcome.family.link,
      student_id: outcome.student.student_id,
      first_class: metadata.first_class?.status === 'pending' ? 'pending' : null,
      next_action: 'PREPARE_FIRST_CLASS',
    };
  }

  const access = metadata.enrollment_access;
  if (access && !access.revoked_at && !access.used_at) {
    return {
      state: access.opened_at ? 'link_opened' : 'link_issued',
      expires_at: access.expires_at,
      family_ref: null,
      family_link: null,
      student_id: null,
      first_class: null,
      next_action: 'SEND_ENROLLMENT_LINK',
    };
  }

  return {
    state: 'none',
    expires_at: null,
    family_ref: null,
    family_link: null,
    student_id: null,
    first_class: null,
    next_action: 'SEND_ENROLLMENT_LINK',
  };
}
