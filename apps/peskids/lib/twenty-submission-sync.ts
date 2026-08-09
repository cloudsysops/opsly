import { TwentyClient, resolveTwentyEnv } from '@intcloudsysops/services';
import { splitParentName } from '@/lib/twenty-lead-sync';

export interface SubmissionSyncInput {
  parentEmail: string;
  parentName?: string;
}

export interface TwentySubmissionSyncResult {
  twentyPersonId: string;
  created: boolean;
}

/** Look up the parent's Twenty person by email before creating one, so a
 * family that already has a Twenty person from a lead or a prior submission
 * doesn't get a duplicate. */
export async function syncSubmissionToTwenty(
  data: SubmissionSyncInput
): Promise<TwentySubmissionSyncResult | null> {
  const email = data.parentEmail?.trim();
  if (!email) {
    return null;
  }

  try {
    const env = resolveTwentyEnv();
    if (!env.enabled) {
      return null;
    }

    const client = new TwentyClient(env.apiKey, env.baseUrl);

    const existing = await client.findPersonByEmail(email);
    if (existing) {
      return { twentyPersonId: existing.id, created: false };
    }

    const name = splitParentName(data.parentName || 'Familia Peskids');
    const person = await client.createPerson({
      name,
      emails: { primaryEmail: email },
    });

    return { twentyPersonId: person.id, created: true };
  } catch (err) {
    console.warn('[twenty-submission-sync] Failed to sync submission to Twenty:', err);
    return null;
  }
}
