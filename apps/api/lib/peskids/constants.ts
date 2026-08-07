/** Peskids incubation tenant slug (MVP). */
export const PESKIDS_TENANT_SLUG = 'peskids' as const;

export const PESKIDS_GRADE_VALUES = ['K-5', '6-8', '9-12', 'Other'] as const;

export const PESKIDS_REFERRAL_SOURCES = [
  'Facebook',
  'Instagram',
  'Website',
  'Referral',
  'Google',
  'Friend',
  'Other',
  'Not sure',
] as const;

/** Clase en sede Llanogrande o a domicilio del alumno. */
export const PESKIDS_CLASS_MODALITY_VALUES = ['llanogrande', 'domicilio'] as const;

export const PESKIDS_LEAD_TYPES = ['family', 'teacher_applicant', 'company'] as const;

export const PESKIDS_SERVICE_MODES = ['llanogrande', 'domicilio', 'institutional'] as const;

export const PESKIDS_CLASS_MODALITY_LABELS: Record<
  (typeof PESKIDS_CLASS_MODALITY_VALUES)[number],
  string
> = {
  llanogrande: 'Sede Llanogrande',
  domicilio: 'A domicilio',
};

export const PESKIDS_LEAD_STATUSES = [
  'new',
  'contacted',
  'qualified',
  'lost',
  'converted',
] as const;

export const PESKIDS_FEEDBACK_STATUSES = ['new', 'reviewed', 'action_required', 'closed'] as const;

export const PESKIDS_MESSAGE_STATUSES = [
  'pending_approval',
  'approved',
  'rejected',
  'sent',
  'failed',
] as const;

/** Ratings at or below this value set feedback status to action_required. */
export const PESKIDS_LOW_SATISFACTION_THRESHOLD = 3;

/** Private Storage bucket for teacher-applicant CV / swim-video uploads (service_role only). */
export const PESKIDS_TEACHER_ATTACHMENTS_BUCKET = 'peskids-teacher-applications' as const;
