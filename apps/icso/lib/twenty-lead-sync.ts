import {
  TwentyClient,
  resolveTwentyEnvForIntcloudsysops,
} from '@intcloudsysops/services/twenty';

export interface IcsoLeadData {
  name: string;
  email: string;
  message: string;
  source?: string;
}

export interface TwentyLeadSyncResult {
  twentyPersonId: string;
  twentyOpportunityId: string;
}

function splitName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: 'Lead', lastName: 'ICSO' };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'ICSO' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

export async function sendLeadToTwenty(
  data: IcsoLeadData
): Promise<TwentyLeadSyncResult | null> {
  try {
    const env = resolveTwentyEnvForIntcloudsysops();
    if (!env.enabled) {
      console.warn('[icso-twenty-lead-sync] Twenty CRM not configured for ICSO');
      return null;
    }

    const client = new TwentyClient(env.apiKey, env.baseUrl);
    const name = splitName(data.name);

    const person = await client.createPerson({
      name,
      emails: { primaryEmail: data.email.trim() },
      jobTitle: data.source?.trim() || 'ICSO Website',
    });

    const opportunity = await client.createOpportunity({
      name: `ICSO — ${data.name.trim()}`,
      stage: env.defaultOpportunityStage,
      pointOfContact: { connect: { id: person.id } },
    });

    return {
      twentyPersonId: person.id,
      twentyOpportunityId: opportunity.id,
    };
  } catch (err) {
    console.warn('[icso-twenty-lead-sync] Failed to send lead to Twenty:', err);
    return null;
  }
}
