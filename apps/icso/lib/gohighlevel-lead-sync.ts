/**
 * LEGACY (GHL compatibility): optional dual-write when INTCLOUDSYSOPS_GHL_ENABLED=true.
 * New leads use syncLeadToCrm() → Twenty + Supabase; do not call from new code paths.
 * @deprecated Use syncLeadToCrm() — GHL is opt-in legacy only.
 */
import { isIntcloudsysopsGhlEnabled } from '@intcloudsysops/services/twenty';
import {
  GoHighLevelClient,
  isGoHighLevelConfigured,
  resolveGoHighLevelEnv,
} from '@intcloudsysops/services/gohighlevel';
import type { IcsoLeadData } from '@/lib/twenty-lead-sync';

export async function sendLeadToGHL(
  data: IcsoLeadData
): Promise<{ ghlContactId: string } | null> {
  if (!isIntcloudsysopsGhlEnabled()) {
    return null;
  }

  if (!isGoHighLevelConfigured()) {
    console.warn('[icso-gohighlevel-lead-sync] GHL agency not configured');
    return null;
  }

  try {
    const ghlEnv = resolveGoHighLevelEnv();
    const client = new GoHighLevelClient(ghlEnv.apiKey, ghlEnv.baseUrl, {
      locationId: ghlEnv.locationId,
      apiVersion: ghlEnv.apiVersion,
    });

    const contact = await client.createContact({
      firstName: data.name.split(' ')[0],
      lastName: data.name.split(' ').slice(1).join(' '),
      email: data.email,
      source: data.source || 'ICSO Website',
      customFields: {
        Message: data.message,
        Source_Form: 'ICSO Contact Form',
      },
    });

    if (!contact.id) {
      console.warn('[icso-gohighlevel-lead-sync] GHL contact created without id');
      return null;
    }

    return { ghlContactId: contact.id };
  } catch (err) {
    console.warn('[icso-gohighlevel-lead-sync] Failed to send lead to GHL:', err);
    return null;
  }
}
