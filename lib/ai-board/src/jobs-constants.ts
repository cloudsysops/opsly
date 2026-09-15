export const CONTACT_HOT_LEAD_ACCEPTANCE = [
  'context_summarized',
  'approved_template_selected',
  'draft_generated',
  'human_action_available',
] as const;

export function boardJobIdempotencyKey(
  tenantSlug: string,
  jobType: string,
  signalType: string,
  entityId: string
): string {
  return `${tenantSlug}:${jobType}:${signalType}:${entityId}`;
}
