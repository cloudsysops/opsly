import { isPeskidsGhlEnabled, isTwentyConfigured } from '@intcloudsysops/services';
import { sendLeadToGHL } from '@/lib/gohighlevel-lead-sync';
import {
  resolvePeskidsIntegrationProviders,
  shouldSyncLeadToGhl,
  shouldSyncLeadToTwenty,
} from '@/lib/integrations/peskids-provider-config';
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
  const providers = resolvePeskidsIntegrationProviders();
  const twentyConfigured = isTwentyConfigured();
  const ghlEnabled = isPeskidsGhlEnabled();

  if (providers.crm === 'espocrm') {
    console.warn('[peskids][crm] espocrm provider selected but adapter not implemented yet');
    return result;
  }

  if (shouldSyncLeadToTwenty(providers, twentyConfigured)) {
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

  if (shouldSyncLeadToGhl(providers, ghlEnabled)) {
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
