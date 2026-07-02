import { isPeskidsGhlEnabled, isTwentyConfigured } from '@intcloudsysops/services/twenty';
import { sendLeadToGHL } from '@/lib/gohighlevel-lead-sync';
import { sendLeadToTwenty } from '@/lib/twenty-lead-sync';

export type CrmLeadSyncInput = {
  parentName: string;
  email: string;
  phone?: string;
  gradeInterested?: string;
  source?: string;
};

export type CrmLeadSyncResult = {
  ghlContactId?: string;
  twentyPersonId?: string;
  twentyOpportunityId?: string;
};

export async function syncLeadToCrm(data: CrmLeadSyncInput): Promise<CrmLeadSyncResult> {
  const result: CrmLeadSyncResult = {};

  if (isTwentyConfigured()) {
    const twentyResult = await sendLeadToTwenty({
      parentName: data.parentName,
      email: data.email,
      phone: data.phone,
      gradeInterested: data.gradeInterested,
      source: data.source,
    });
    if (twentyResult) {
      result.twentyPersonId = twentyResult.twentyPersonId;
      result.twentyOpportunityId = twentyResult.twentyOpportunityId;
    }
  }

  if (isPeskidsGhlEnabled()) {
    const ghlResult = await sendLeadToGHL({
      parentName: data.parentName,
      email: data.email,
      phone: data.phone,
      gradeInterested: data.gradeInterested,
      source: data.source || 'web',
    });
    if (ghlResult) {
      result.ghlContactId = ghlResult.ghlContactId;
    }
  }

  return result;
}
