import { isIntcloudsysopsTwentyConfigured } from '@intcloudsysops/services/twenty';
import { sendLeadToTwenty, type IcsoLeadData } from '@/lib/twenty-lead-sync';

export type CrmLeadSyncInput = IcsoLeadData;

export type CrmLeadSyncResult = {
  twentyPersonId?: string;
  twentyOpportunityId?: string;
};

/** Sync marketing leads to Twenty CRM (primary). Supabase persistence is separate. */
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
