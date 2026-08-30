import { isTwentyConfigured } from '@intcloudsysops/services';
import {
  resolvePeskidsIntegrationProviders,
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
  twentyPersonId?: string;
  twentyOpportunityId?: string;
};

/** Sync new leads to Twenty CRM (canonical). legacy CRM dual-write removed. */
export async function syncLeadToCrm(data: CrmLeadSyncInput): Promise<CrmLeadSyncResult> {
  const result: CrmLeadSyncResult = {};
  const providers = resolvePeskidsIntegrationProviders();
  const twentyConfigured = isTwentyConfigured();

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

  return result;
}
