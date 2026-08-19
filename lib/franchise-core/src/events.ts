export const FRANCHISE_EVENTS = {
  franchiseCreated: 'franchise.created',
  franchiseApproved: 'franchise.approved',
  unitOpeningStarted: 'unit.opening.started',
  unitActivated: 'unit.activated',
  territoryAssigned: 'territory.assigned',
  agreementActivated: 'agreement.activated',
  agreementExpiring: 'agreement.expiring',
  agreementExpired: 'agreement.expired',
  salesReported: 'sales.reported',
  royaltyCalculated: 'royalty.calculated',
  royaltyDue: 'royalty.due',
  royaltyOverdue: 'royalty.overdue',
  royaltyPaid: 'royalty.paid',
  auditScheduled: 'audit.scheduled',
  auditCompleted: 'audit.completed',
  findingCreated: 'finding.created',
  correctiveActionCreated: 'corrective_action.created',
  correctiveActionOverdue: 'corrective_action.overdue',
} as const;

export type FranchiseEventName = (typeof FRANCHISE_EVENTS)[keyof typeof FRANCHISE_EVENTS];

export type FranchiseEvent = {
  name: FranchiseEventName;
  tenantId: string;
  unitId: string | null;
  occurredAt: string;
  payload: Record<string, string | number | boolean | null>;
};

export function franchiseEvent(
  name: FranchiseEventName,
  input: Omit<FranchiseEvent, 'name'>
): FranchiseEvent {
  return { name, ...input };
}
