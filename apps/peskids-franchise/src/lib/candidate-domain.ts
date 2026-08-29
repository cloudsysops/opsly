export const CANDIDATE_STATUSES = [
  'lead',
  'qualified',
  'discovery',
  'financial_review',
  'approved',
  'agreement',
  'opening',
  'active',
  'rejected',
  'withdrawn',
] as const;

export type CandidateStatus = (typeof CANDIDATE_STATUSES)[number];

const VALID_TRANSITIONS: Record<CandidateStatus, readonly CandidateStatus[]> = {
  lead: ['qualified', 'rejected', 'withdrawn'],
  qualified: ['discovery', 'rejected', 'withdrawn'],
  discovery: ['financial_review', 'rejected', 'withdrawn'],
  financial_review: ['approved', 'rejected', 'withdrawn'],
  approved: ['agreement', 'rejected', 'withdrawn'],
  agreement: ['opening', 'rejected', 'withdrawn'],
  opening: ['active', 'rejected', 'withdrawn'],
  active: [],
  rejected: [],
  withdrawn: [],
};

export function canTransitionCandidate(from: CandidateStatus, to: CandidateStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertCandidateTransition(from: CandidateStatus, to: CandidateStatus): void {
  if (!canTransitionCandidate(from, to)) {
    throw new Error(`Invalid candidate transition: ${from} -> ${to}`);
  }
}

export function isCandidateStatus(value: unknown): value is CandidateStatus {
  return typeof value === 'string' && (CANDIDATE_STATUSES as readonly string[]).includes(value);
}
