import type { FranchiseRole } from '@intcloudsysops/franchise-core';

export type FranchiseActor = {
  tenantId: string;
  tenantSlug: string;
  actorId: string;
  role: FranchiseRole;
  assignedUnitIds: readonly string[];
  requestId: string;
};
