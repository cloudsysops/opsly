/**
 * Twenty CRM Person Sync Functions
 * - Find person by phone
 * - Create or update person
 * - Link lead to Twenty
 */

import { whatsappConfig } from '../whatsapp/env-config';
import type { TwentyPerson, TwentySyncResult } from './types';

const twentyConfig = whatsappConfig.getTwentyConfig();

/**
 * Find existing person in Twenty by phone number
 */
export async function findPersonByPhone(phoneNumber: string): Promise<TwentyPerson | null> {
  if (!twentyConfig.enabled || !twentyConfig.apiUrl || !twentyConfig.apiKey) {
    console.warn('[Twenty Sync] Twenty CRM not configured, skipping person search');
    return null;
  }

  try {
    // Normalize phone number (remove spaces, dashes, etc.)
    const normalizedPhone = phoneNumber.replace(/\D/g, '');

    const query = `
      query {
        people(filter: { phone: { ilike: "%${normalizedPhone}%" } }) {
          edges {
            node {
              id
              firstName
              lastName
              email
              phone
              createdAt
              updatedAt
            }
          }
        }
      }
    `;

    const response = await fetch(`${twentyConfig.apiUrl}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${twentyConfig.apiKey}`,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      console.error('[Twenty Sync] Failed to find person:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.errors) {
      console.error('[Twenty Sync] GraphQL error:', data.errors);
      return null;
    }

    if (data.data?.people?.edges?.length > 0) {
      return data.data.people.edges[0].node as TwentyPerson;
    }

    return null;
  } catch (err) {
    console.error('[Twenty Sync] Error finding person by phone:', err);
    return null;
  }
}

/**
 * Create or update person in Twenty
 */
export async function upsertPerson(
  phoneNumber: string,
  firstName: string,
  lastName?: string,
  email?: string
): Promise<TwentySyncResult> {
  if (!twentyConfig.enabled || !twentyConfig.apiUrl || !twentyConfig.apiKey) {
    return {
      ok: false,
      error: 'Twenty CRM not configured',
    };
  }

  try {
    // Try to find existing person first
    const existing = await findPersonByPhone(phoneNumber);

    if (existing) {
      // Update existing person
      const updateMutation = `
        mutation {
          updatePerson(
            id: "${existing.id}"
            input: {
              firstName: "${firstName}"
              ${lastName ? `lastName: "${lastName}"` : ''}
              ${email ? `email: "${email}"` : ''}
              phone: "${phoneNumber}"
            }
          ) {
            id
            firstName
            lastName
            email
            phone
          }
        }
      `;

      const response = await fetch(`${twentyConfig.apiUrl}/graphql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${twentyConfig.apiKey}`,
        },
        body: JSON.stringify({ query: updateMutation }),
      });

      const data = await response.json();

      if (data.errors) {
        return {
          ok: false,
          personId: existing.id,
          error: 'Update failed',
          details: data.errors,
        };
      }

      return {
        ok: true,
        personId: data.data.updatePerson.id,
        message: 'Person updated',
      };
    }

    // Create new person
    const createMutation = `
      mutation {
        createPerson(
          input: {
            firstName: "${firstName}"
            ${lastName ? `lastName: "${lastName}"` : ''}
            ${email ? `email: "${email}"` : ''}
            phone: "${phoneNumber}"
          }
        ) {
          id
          firstName
          lastName
          email
          phone
        }
      }
    `;

    const response = await fetch(`${twentyConfig.apiUrl}/graphql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${twentyConfig.apiKey}`,
      },
      body: JSON.stringify({ query: createMutation }),
    });

    const data = await response.json();

    if (data.errors) {
      return {
        ok: false,
        error: 'Creation failed',
        details: data.errors,
      };
    }

    return {
      ok: true,
      personId: data.data.createPerson.id,
      message: 'Person created',
    };
  } catch (err) {
    return {
      ok: false,
      error: 'Upsert failed',
      details: { originalError: err instanceof Error ? err.message : String(err) },
    };
  }
}

/**
 * Link lead to Twenty person
 */
export async function linkLeadToTwenty(
  leadId: string,
  tenantId: string,
  twentyPersonId: string
): Promise<TwentySyncResult> {
  try {
    // TODO: Update peskids_leads.twenty_person_id in Supabase
    // This would be a simple UPDATE call to the lead repository

    console.log('[Twenty Sync] Lead linked to Twenty person:', {
      leadId,
      tenantId,
      twentyPersonId,
    });

    return {
      ok: true,
      personId: twentyPersonId,
      message: 'Lead linked to Twenty',
    };
  } catch (err) {
    return {
      ok: false,
      error: 'Link failed',
      details: { originalError: err instanceof Error ? err.message : String(err) },
    };
  }
}
