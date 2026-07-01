import {
  GoHighLevelClient,
} from '@intcloudsysops/services/gohighlevel';
import type { CreateContactRequest } from '@intcloudsysops/services/gohighlevel';

const resolveGoHighLevelICSOEnv = () => ({
  apiKey: process.env.GOHIGHLEVEL_API_KEY || '',
  locationId: process.env.GOHIGHLEVEL_LOCATION_ID || '',
  baseUrl: process.env.GOHIGHLEVEL_BASE_URL || 'https://services.leadconnectorhq.com',
  apiVersion: process.env.GOHIGHLEVEL_API_VERSION || 'v1',
});

export interface AccountData {
  name: string;
  accountType: 'prospect' | 'customer' | 'partner' | 'vendor';
  billingEmail?: string;
  website?: string;
  industry?: string;
  employeeCount?: number;
}

export interface ContactData {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: 'decision_maker' | 'influencer' | 'user' | 'other';
  accountId: string;
}

export interface DealData {
  title: string;
  accountId: string;
  value: number;
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'won' | 'lost';
  probability: number;
  closeDate?: string;
  owner: string;
}

export async function syncAccountToGHL(
  accountData: AccountData,
): Promise<{ ghlContactId: string } | null> {
  try {
    const env = resolveGoHighLevelICSOEnv();
    if (!env.apiKey) {
      console.warn('[ghl-sync-account] GHL not configured');
      return null;
    }

    const client = new GoHighLevelClient(env.apiKey, env.baseUrl, {
      locationId: env.locationId,
      apiVersion: env.apiVersion,
    });

    const customFields: Record<string, unknown> = {
      account_type: accountData.accountType,
      tenant_slug: 'intcloudsysops',
    };

    if (accountData.industry) customFields.industry = accountData.industry;
    if (accountData.employeeCount) customFields.employee_count = accountData.employeeCount;
    if (accountData.website) customFields.website = accountData.website;

    const contactPayload: CreateContactRequest = {
      name: accountData.name,
      email: accountData.billingEmail || '',
      source: 'crm_sync',
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    };

    const contact = await client.createContact(contactPayload);

    if (!contact.id) {
      console.warn('[ghl-sync-account] GHL contact created without id');
      return null;
    }

    return { ghlContactId: contact.id };
  } catch (err) {
    console.warn('[ghl-sync-account] Failed to sync account to GHL:', err);
    return null;
  }
}

export async function syncContactToGHL(
  contactData: ContactData,
): Promise<{ ghlContactId: string } | null> {
  try {
    const env = resolveGoHighLevelICSOEnv();
    if (!env.apiKey) {
      console.warn('[ghl-sync-contact] GHL not configured');
      return null;
    }

    const client = new GoHighLevelClient(env.apiKey, env.baseUrl, {
      locationId: env.locationId,
      apiVersion: env.apiVersion,
    });

    const customFields: Record<string, unknown> = {
      account_id: contactData.accountId,
      role: contactData.role,
      tenant_slug: 'intcloudsysops',
    };

    const contactPayload: CreateContactRequest = {
      name: `${contactData.firstName} ${contactData.lastName}`,
      email: contactData.email,
      phone: contactData.phone || undefined,
      source: 'crm_sync',
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    };

    const contact = await client.createContact(contactPayload);

    if (!contact.id) {
      console.warn('[ghl-sync-contact] GHL contact created without id');
      return null;
    }

    return { ghlContactId: contact.id };
  } catch (err) {
    console.warn('[ghl-sync-contact] Failed to sync contact to GHL:', err);
    return null;
  }
}

export async function syncDealToGHL(
  dealData: DealData,
): Promise<{ ghlDealId: string } | null> {
  try {
    const env = resolveGoHighLevelICSOEnv();
    if (!env.apiKey) {
      console.warn('[ghl-sync-deal] GHL not configured');
      return null;
    }

    const client = new GoHighLevelClient(env.apiKey, env.baseUrl, {
      locationId: env.locationId,
      apiVersion: env.apiVersion,
    });

    // GHL pipelines and stages need to be configured in advance
    // This is a placeholder for pipeline configuration
    const customFields: Record<string, unknown> = {
      account_id: dealData.accountId,
      deal_value: dealData.value,
      deal_stage: dealData.stage,
      deal_probability: dealData.probability,
      deal_owner: dealData.owner,
      tenant_slug: 'intcloudsysops',
    };

    if (dealData.closeDate) customFields.close_date = dealData.closeDate;

    // Note: GHL deals API is different from contacts API
    // This would need a separate GHL opportunity/deal endpoint integration
    // For now, we store deal metadata in a custom contact as deal record
    const dealRecordPayload: CreateContactRequest = {
      name: dealData.title,
      email: `deal-${dealData.accountId}@intcloudsysops.local`,
      source: 'deal_sync',
      customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
    };

    const dealRecord = await client.createContact(dealRecordPayload);

    if (!dealRecord.id) {
      console.warn('[ghl-sync-deal] GHL deal record created without id');
      return null;
    }

    return { ghlDealId: dealRecord.id };
  } catch (err) {
    console.warn('[ghl-sync-deal] Failed to sync deal to GHL:', err);
    return null;
  }
}
