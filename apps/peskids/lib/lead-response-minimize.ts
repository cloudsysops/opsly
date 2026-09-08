import type { DashboardLead } from '@/lib/services/lead-admin.service';

export type StaffLeadView = Omit<DashboardLead, 'child_name'> & {
  has_child_name: boolean;
};

/** Staff APIs keep operational contact fields; child given names stay out of JSON. */
export function minimizeLeadForStaffApi(lead: DashboardLead): StaffLeadView {
  const { child_name: childName, ...rest } = lead;
  return {
    ...rest,
    has_child_name: Boolean(childName && childName.trim()),
  };
}
