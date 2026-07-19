// NOTE: GoHighLevel services removed. This module is deprecated and should be replaced with WhatsApp integration.
// import { resolveGoHighLevelPeskidsEnv } from '@intcloudsysops/services/gohighlevel';
import { alertGhlFailure } from '../alerting/slack-notifier';
import { recordGhlApiError } from '../metrics/metrics-collector';

const GHL_API_BASE = 'https://services.leadconnectorhq.com';
const DEFAULT_NEW_LEAD_STAGE_ID = 'f4c7365b-efe8-4d33-9559-c7f06881f172';

function getNewLeadStageId(): string {
  return process.env.GOHIGHLEVEL_PESKIDS_NEW_LEAD_STAGE_ID || DEFAULT_NEW_LEAD_STAGE_ID;
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

async function searchOpportunity(contactId: string): Promise<Opportunity | null> {
  try {
    const env = resolveGoHighLevelPeskidsEnv();
    const response = await fetch(`${GHL_API_BASE}/opportunities/search`, {
      method: 'POST',
      headers: getClientHeaders(),
      body: JSON.stringify({
        locationId: env.locationId,
        contactId,
        page: 1,
        limit: 1,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      console.warn('[opportunity] search failed:', response.status, errorText);
      // Alert and record metric only for actual errors (not 404-like statuses)
      if (response.status >= 500 || response.status === 429) {
        await recordGhlApiError('peskids', response.status, 'searchOpportunity');
        await alertGhlFailure('searchOpportunity', response.status, errorText, contactId);
      }
      return null;
    }

    const data = (await response.json()) as {
      opportunities?: Opportunity[];
      data?: Opportunity[];
    };

    const opportunities = data.opportunities ?? data.data ?? [];
    return opportunities[0] || null;
  } catch (err) {
    console.warn('[opportunity] search error:', err);
    await recordGhlApiError('peskids', 0, 'searchOpportunity');
    await alertGhlFailure('searchOpportunity', undefined, err instanceof Error ? err.message : String(err), contactId);
    return null;
  }
}

async function createOpportunity(contactId: string, parentName: string): Promise<Opportunity | null> {
  try {
    const env = resolveGoHighLevelPeskidsEnv();
    const pipelineId = getPeskidsPipelineId();
    if (!pipelineId) {
      console.warn('[opportunity] GOHIGHLEVEL_PESKIDS_PIPELINE_ID not set; cannot create opportunity');
      await alertGhlFailure('createOpportunity', undefined, 'GOHIGHLEVEL_PESKIDS_PIPELINE_ID not set', contactId);
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
      const errorText = await response.text().catch(() => '');
      console.warn('[opportunity] creation failed:', response.status, errorText);
      await recordGhlApiError('peskids', response.status, 'createOpportunity');
      await alertGhlFailure('createOpportunity', response.status, errorText, contactId);
      return null;
    }

    const data = (await response.json()) as {
      opportunity?: Opportunity;
      data?: Opportunity;
    };

    return data.opportunity ?? data.data ?? null;
  } catch (err) {
    console.warn('[opportunity] creation error:', err);
    await recordGhlApiError('peskids', 0, 'createOpportunity');
    await alertGhlFailure('createOpportunity', undefined, err instanceof Error ? err.message : String(err), contactId);
    return null;
  }
}

export async function createPipelineOpportunity(
  ghlContactId: string,
  parentName: string
): Promise<{ opportunityId: string } | null> {
  try {
    const env = resolveGoHighLevelPeskidsEnv();
    if (!env.apiKey) {
      console.warn('[opportunity] GHL Peskids not configured');
      return null;
    }

    let opportunity = await searchOpportunity(ghlContactId);

    if (!opportunity?.id) {
      opportunity = await createOpportunity(ghlContactId, parentName);
    }

    if (!opportunity?.id) {
      console.warn('[opportunity] could not find or create opportunity for contact', ghlContactId);
      return null;
    }

    const stageId = getNewLeadStageId();
    if (opportunity.pipelineStageId !== stageId) {
      try {
        const pipelineId = getPeskidsPipelineId();
        if (pipelineId) {
          await fetch(`${GHL_API_BASE}/opportunities/${opportunity.id}`, {
            method: 'PUT',
            headers: getClientHeaders(),
            body: JSON.stringify({
              pipelineId,
              pipelineStageId: stageId,
            }),
          });
        }
      } catch (err) {
        console.warn('[opportunity] failed to update stage:', err);
      }
    }

    return { opportunityId: opportunity.id };
  } catch (err) {
    console.warn('[opportunity] createPipelineOpportunity error:', err);
    return null;
  }
}
