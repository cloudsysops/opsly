import { TwentyClient, resolveTwentyEnv } from '@intcloudsysops/services/twenty';

export interface LeadData {
  parentName: string;
  email: string;
  phone?: string;
  childName?: string;
  childAge?: string;
  interest?: string;
  gradeInterested?: string;
  source?: string;
}

export interface TwentyLeadSyncResult {
  twentyPersonId: string;
  twentyOpportunityId: string;
}

function splitParentName(fullName: string): { firstName: string; lastName: string } {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: 'Lead', lastName: 'Peskids' };
  }
  const parts = trimmed.split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: 'Peskids' };
  }
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(' '),
  };
}

function buildOpportunityName(data: LeadData): string {
  const grade = data.gradeInterested?.trim();
  if (grade) {
    return `Peskids — ${data.parentName.trim()} (${grade})`;
  }
  return `Peskids — ${data.parentName.trim()}`;
}

export async function sendLeadToTwenty(
  data: LeadData
): Promise<TwentyLeadSyncResult | null> {
  try {
    const env = resolveTwentyEnv();
    if (!env.enabled) {
      console.warn('[twenty-lead-sync] Twenty CRM not configured for Peskids');
      return null;
    }

    const client = new TwentyClient(env.apiKey, env.baseUrl);
    const name = splitParentName(data.parentName);

    const person = await client.createPerson({
      name,
      emails: { primaryEmail: data.email.trim() },
      ...(data.phone?.trim()
        ? { phones: { primaryPhoneNumber: data.phone.trim() } }
        : {}),
      jobTitle: data.gradeInterested?.trim() || undefined,
    });

    const opportunity = await client.createOpportunity({
      name: buildOpportunityName(data),
      stage: env.defaultOpportunityStage,
      pointOfContact: { connect: { id: person.id } },
    });

    return {
      twentyPersonId: person.id,
      twentyOpportunityId: opportunity.id,
    };
  } catch (err) {
    console.warn('[twenty-lead-sync] Failed to send lead to Twenty:', err);
    return null;
  }
}
