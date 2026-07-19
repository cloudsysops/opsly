/**
 * Twenty CRM Opportunity Creation
 * - Create opportunities for qualified leads
 * - Safe failure (doesn't block lead ingestion)
 */

import { whatsappConfig } from '../whatsapp/env-config';
import type { TwentyOpportunity, TwentySyncResult } from './types';

const twentyConfig = whatsappConfig.getTwentyConfig();

/**
 * Create opportunity for lead in Twenty
 */
export async function createOpportunity(
  personId: string,
  leadName: string,
  amount?: number,
  closeDate?: string
): Promise<TwentySyncResult> {
  if (!twentyConfig.enabled || !twentyConfig.apiUrl || !twentyConfig.apiKey) {
    return {
      ok: false,
      error: 'Twenty CRM not configured',
    };
  }

  try {
    const mutation = `
      mutation {
        createOpportunity(
          input: {
            name: "${leadName}"
            stage: "INTEREST"
            ${amount ? `amount: ${amount}` : ''}
            ${closeDate ? `closeDate: "${closeDate}"` : ''}
            personId: "${personId}"
          }
        ) {
          id
          name
          stage
          amount
          closeDate
          personId
        }
      }
    `;

    const response = await fetch(`${twentyConfig.apiUrl}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${twentyConfig.apiKey}`,
      },
      body: JSON.stringify({ query: mutation }),
    });

    const data = await response.json();

    if (data.errors) {
      return {
        ok: false,
        error: 'Opportunity creation failed',
        details: data.errors,
      };
    }

    return {
      ok: true,
      opportunityId: data.data.createOpportunity.id,
      personId,
      message: 'Opportunity created',
    };
  } catch (err) {
    return {
      ok: false,
      error: 'Opportunity creation exception',
      details: { originalError: err instanceof Error ? err.message : String(err) },
    };
  }
}

/**
 * Update opportunity stage (e.g., from INTEREST to QUALIFIED)
 */
export async function updateOpportunityStage(
  opportunityId: string,
  newStage: string
): Promise<TwentySyncResult> {
  if (!twentyConfig.enabled || !twentyConfig.apiUrl || !twentyConfig.apiKey) {
    return {
      ok: false,
      error: 'Twenty CRM not configured',
    };
  }

  try {
    const mutation = `
      mutation {
        updateOpportunity(
          id: "${opportunityId}"
          input: {
            stage: "${newStage}"
          }
        ) {
          id
          name
          stage
        }
      }
    `;

    const response = await fetch(`${twentyConfig.apiUrl}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${twentyConfig.apiKey}`,
      },
      body: JSON.stringify({ query: mutation }),
    });

    const data = await response.json();

    if (data.errors) {
      return {
        ok: false,
        error: 'Stage update failed',
        details: data.errors,
      };
    }

    return {
      ok: true,
      opportunityId: data.data.updateOpportunity.id,
      message: 'Stage updated',
    };
  } catch (err) {
    return {
      ok: false,
      error: 'Stage update exception',
      details: { originalError: err instanceof Error ? err.message : String(err) },
    };
  }
}
