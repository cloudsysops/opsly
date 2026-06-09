import {
  GoHighLevelClient,
  resolveGoHighLevelPeskidsEnv,
} from '@intcloudsysops/services/gohighlevel';
import type { CreateContactRequest } from '@intcloudsysops/services/gohighlevel';

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

export async function sendLeadToGHL(
  data: LeadData
): Promise<{ ghlContactId: string } | null> {
  try {
    const env = resolveGoHighLevelPeskidsEnv();
    if (!env.apiKey) {
      console.warn('[gohighlevel-lead-sync] GHL Peskids not configured');
      return null;
    }

    const client = new GoHighLevelClient(env.apiKey, env.baseUrl, {
      locationId: env.locationId,
      apiVersion: env.apiVersion,
    });

    const customFields: Record<string, unknown> = {};
    if (data.childName) customFields.child_name = data.childName;
    if (data.childAge) customFields.child_age = data.childAge;
    if (data.interest) customFields.interest = data.interest;
    if (data.gradeInterested) customFields.grade_interested = data.gradeInterested;

    const contactPayload: CreateContactRequest = {
      name: data.parentName,
      email: data.email,
      phone: data.phone || undefined,
      source: data.source || 'web',
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    };

    const contact = await client.createContact(contactPayload);

    if (!contact.id) {
      console.warn('[gohighlevel-lead-sync] GHL contact created without id');
      return null;
    }

    return { ghlContactId: contact.id };
  } catch (err) {
    console.warn('[gohighlevel-lead-sync] Failed to send lead to GHL:', err);
    return null;
  }
}
