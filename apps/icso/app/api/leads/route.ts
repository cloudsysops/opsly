import { type NextRequest, NextResponse } from 'next/server';
import { syncLeadToCrm } from '@/lib/icso-crm-sync';
import { resolveIcsoDiscoveryBookingUrl } from '@/lib/icso-discovery-link';
import { persistIcsoLead } from '@/lib/icso-lead-store';
import { isIcsoSupabaseConfigured } from '@/lib/supabase-server';

export const runtime = 'nodejs';

interface IcsoLeadRequest {
  name: string;
  email: string;
  message: string;
  packageId?: string;
  verticalId?: string;
  moduleId?: string;
}

interface IcsoLeadResponse {
  success: boolean;
  contactId: string;
  accountId: string;
  dealId: string;
  message: string;
  calendarBookingUrl?: string | null;
  twentyPersonId?: string;
  twentyOpportunityId?: string;
  /** Legacy GHL id when INTCLOUDSYSOPS_GHL_ENABLED=true */
  ghlContactId?: string;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = (await request.json()) as IcsoLeadRequest;
    const { name, email, message, packageId, verticalId, moduleId } = body;

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, message' },
        { status: 400 }
      );
    }

    const enrichedMessage = [
      message.trim(),
      packageId ? `[package=${packageId}]` : '',
      verticalId ? `[vertical=${verticalId}]` : '',
      moduleId ? `[module=${moduleId}]` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (!isIcsoSupabaseConfigured()) {
      return NextResponse.json(
        { error: 'Supabase is not configured for ICSO lead persistence' },
        { status: 503 }
      );
    }

    const crmResult = await syncLeadToCrm({
      name,
      email,
      message: enrichedMessage,
      source: 'ICSO Website',
    });

    const persisted = await persistIcsoLead({
      name,
      email,
      message: enrichedMessage,
      sourceForm: 'ICSO Contact Form',
      ghlContactId: crmResult.ghlContactId,
      twentyPersonId: crmResult.twentyPersonId,
      twentyOpportunityId: crmResult.twentyOpportunityId,
    });

    console.log(
      `[ICSO] Lead persisted: contact=${persisted.contactId} deal=${persisted.dealId} (${email})`
    );

    const calendarBookingUrl = await resolveIcsoDiscoveryBookingUrl();

    const response: IcsoLeadResponse = {
      success: true,
      contactId: persisted.contactId,
      accountId: persisted.accountId,
      dealId: persisted.dealId,
      message: 'Lead submitted successfully',
      calendarBookingUrl,
      ...(crmResult.twentyPersonId
        ? { twentyPersonId: crmResult.twentyPersonId }
        : {}),
      ...(crmResult.twentyOpportunityId
        ? { twentyOpportunityId: crmResult.twentyOpportunityId }
        : {}),
      ...(crmResult.ghlContactId ? { ghlContactId: crmResult.ghlContactId } : {}),
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Internal server error';
    console.error('[ICSO] Lead submission error:', error);
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
