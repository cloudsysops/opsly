import {
  isIntcloudsysopsGhlEnabled,
  isIntcloudsysopsTwentyConfigured,
} from '@intcloudsysops/services/twenty';
import { sendLeadToGHL } from '@/lib/gohighlevel-lead-sync';
import { sendLeadToTwenty, type IcsoLeadData } from '@/lib/twenty-lead-sync';

export type CrmLeadSyncInput = IcsoLeadData;

export type CrmLeadSyncResult = {
  ghlContactId?: string;
  twentyPersonId?: string;
  twentyOpportunityId?: string;
};

export async function syncLeadToCrm(data: CrmLeadSyncInput): Promise<CrmLeadSyncResult> {
  const result: CrmLeadSyncResult = {};

  if (isIntcloudsysopsTwentyConfigured()) {
    const twentyResult = await sendLeadToTwenty(data);
    if (twentyResult) {
      result.twentyPersonId = twentyResult.twentyPersonId;
      result.twentyOpportunityId = twentyResult.twentyOpportunityId;
    }
  }

  if (isIntcloudsysopsGhlEnabled()) {
    const ghlResult = await sendLeadToGHL(data);
    if (ghlResult) {
      result.ghlContactId = ghlResult.ghlContactId;
    }
  }

  return result;
}
