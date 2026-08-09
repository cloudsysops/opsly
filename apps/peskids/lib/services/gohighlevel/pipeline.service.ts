/** @deprecated LEGACY (GHL): maps GHL pipeline stages → public.leads.status. */
import {
  resolveGoHighLevelPeskidsEnv,
} from '@intcloudsysops/services';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const NEW_LEAD_STAGE_ID = 'f4c7365b-efe8-4d33-9559-c7f06881f172';

function getNewLeadStageId(): string {
  return process.env.GOHIGHLEVEL_PESKIDS_NEW_LEAD_STAGE_ID || NEW_LEAD_STAGE_ID;
}

function getPeskidsPipelineId(): string | undefined {
  return process.env.GOHIGHLEVEL_PESKIDS_PIPELINE_ID;
}

function getClientHeaders(): Record<string, string> {
  const env = resolveGoHighLevelPeskidsEnv();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${env.apiKey}`,
    Version: env.apiVersion,
    Accept: 'application/json',
  };
}

interface Opportunity {
  id: string;
  contactId?: string;
  pipelineStageId?: string;
  pipelineId?: string;
  name?: string;
  status?: string;
}

/** Search for an existing opportunity for a given contact. */
async function searchOpportunity(
  contactId: string
): Promise<Opportunity | null> {
  try {
    const env = resolveGoHighLevelPeskidsEnv();
    const response = await fetch(
      `${GHL_API_BASE}/opportunities/search`,
      {
        method: 'POST',
        headers: getClientHeaders(),
        body: JSON.stringify({
          locationId: env.locationId,
          contactId,
          page: 1,
          limit: 1,
        }),
      }
    );

    if (!response.ok) {
      console.warn(
        '[pipeline.service] opportunity search failed:',
        response.status,
        await response.text().catch(() => '')
      );
      return null;
    }

    const data = (await response.json()) as {
      opportunities?: Opportunity[];
      data?: Opportunity[];
    };

    const opportunities = data.opportunities ?? data.data ?? [];
    return opportunities[0] || null;
  } catch (err) {
    console.warn('[pipeline.service] opportunity search error:', err);
    return null;
  }
}

/** Create a new opportunity in the Peskids Enrollment pipeline. */
async function createOpportunity(
  contactId: string,
  parentName: string
): Promise<Opportunity | null> {
  try {
    const env = resolveGoHighLevelPeskidsEnv();
    const pipelineId = getPeskidsPipelineId();
    if (!pipelineId) {
      console.warn(
        '[pipeline.service] GOHIGHLEVEL_PESKIDS_PIPELINE_ID not set; cannot create opportunity'
      );
      return null;
    }

    const response = await fetch(`${GHL_API_BASE}/opportunities/`, {
      method: 'POST',
      headers: getClientHeaders(),
      body: JSON.stringify({
        contactId,
        pipelineId,
        pipelineStageId: getNewLeadStageId(),
        locationId: env.locationId,
        name: `${parentName} - Peskids Enrollment`,
        status: 'open',
      }),
    });

    if (!response.ok) {
      console.warn(
        '[pipeline.service] opportunity creation failed:',
        response.status,
        await response.text().catch(() => '')
      );
      return null;
    }

    const data = (await response.json()) as {
      opportunity?: Opportunity;
      data?: Opportunity;
    };

    return data.opportunity ?? data.data ?? null;
  } catch (err) {
    console.warn('[pipeline.service] opportunity creation error:', err);
    return null;
  }
}

/**
 * Find or create an opportunity for a contact in the Peskids Enrollment pipeline.
 * Moves the contact to the "New Lead" stage.
 */
export async function createPipelineOpportunity(
  ghlContactId: string,
  parentName: string
): Promise<{ opportunityId: string } | null> {
  try {
    const env = resolveGoHighLevelPeskidsEnv();
    if (!env.apiKey) {
      console.warn('[pipeline.service] GHL Peskids not configured');
      return null;
    }

    let opportunity = await searchOpportunity(ghlContactId);

    if (!opportunity?.id) {
      opportunity = await createOpportunity(ghlContactId, parentName);
    }

    if (!opportunity?.id) {
      console.warn(
        '[pipeline.service] could not find or create opportunity for contact',
        ghlContactId
      );
      return null;
    }

    const stageId = getNewLeadStageId();
    if (opportunity.pipelineStageId !== stageId) {
      try {
        const pipelineId = getPeskidsPipelineId();
        if (pipelineId) {
          await fetch(
            `${GHL_API_BASE}/opportunities/${opportunity.id}`,
            {
              method: 'PUT',
              headers: getClientHeaders(),
              body: JSON.stringify({
                pipelineId,
                pipelineStageId: stageId,
              }),
            }
          );
        }
      } catch (err) {
        console.warn(
          '[pipeline.service] failed to update opportunity stage:',
          err
        );
      }
    }

    return { opportunityId: opportunity.id };
  } catch (err) {
    console.warn('[pipeline.service] createPipelineOpportunity error:', err);
    return null;
  }
}
