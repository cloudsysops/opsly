import { isIntcloudsysopsTwentyConfigured } from '@intcloudsysops/services/twenty';
import { sendLeadToTwenty, type IcsoLeadData } from '@/lib/twenty-lead-sync';

export type CrmLeadSyncInput = IcsoLeadData;

export type CrmLeadSyncResult = {
  twentyPersonId?: string;
  twentyOpportunityId?: string;
};

/** Sync ICSO leads to Twenty CRM (canonical). legacy CRM dual-write removed. */
export async function syncLeadToCrm(data: CrmLeadSyncInput): Promise<CrmLeadSyncResult> {
  const result: CrmLeadSyncResult = {};

  if (isIntcloudsysopsTwentyConfigured()) {
    const twentyResult = await sendLeadToTwenty(data);
    if (twentyResult) {
      result.twentyPersonId = twentyResult.twentyPersonId;
      result.twentyOpportunityId = twentyResult.twentyOpportunityId;
    }
  }

  return result;
}
