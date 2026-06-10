import { type NextRequest, NextResponse } from 'next/server';
import { GoHighLevelClient, isGoHighLevelConfigured, resolveGoHighLevelEnv } from '@intcloudsysops/services/gohighlevel';
import { findIcsoDiscoveryCalendar } from '@/lib/ghl-setup';

export const runtime = 'nodejs';

interface IcsoLeadRequest {
  name: string;
  email: string;
  message: string;
}

interface IcsoLeadResponse {
  success: boolean;
  contactId: string;
  message: string;
  calendarBookingUrl?: string | null;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Parse the request body
    const body = await request.json() as IcsoLeadRequest;
    const { name, email, message } = body;

    // Validate required fields
    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Missing required fields: name, email, message' },
        { status: 400 }
      );
    }

    // Check if GHL is configured
    if (!isGoHighLevelConfigured()) {
      return NextResponse.json(
        { error: 'GoHighLevel is not configured' },
        { status: 503 }
      );
    }

    const ghlEnv = resolveGoHighLevelEnv();
    const client = new GoHighLevelClient(ghlEnv.apiKey, ghlEnv.baseUrl, {
      locationId: ghlEnv.locationId,
      apiVersion: ghlEnv.apiVersion,
    });

    // Create contact in GHL
    const contact = await client.createContact({
      firstName: name.split(' ')[0],
      lastName: name.split(' ').slice(1).join(' '),
      email,
      source: 'ICSO Website',
      customFields: {
        'Message': message,
        'Source_Form': 'ICSO Contact Form',
      },
    });

    // Log successful lead creation
    console.log(`[ICSO] Lead created: ${contact.id} (${email})`);

    // Get calendar booking link if available
    let calendarBookingUrl: string | null = null;
    try {
      const calendarId = await findIcsoDiscoveryCalendar();
      if (calendarId) {
        const locationId = ghlEnv.locationId;
        // GHL calendar booking URL format: https://gohighlevel.com/calendar/{locationId}/{calendarId}
        calendarBookingUrl = `https://app.gohighlevel.com/calendar/${locationId}/${calendarId}`;
        console.log(`[ICSO] Calendar booking URL: ${calendarBookingUrl}`);
      }
    } catch (calendarError) {
      console.warn('[ICSO] Failed to get calendar booking URL:', calendarError);
      // Continue without calendar URL; it's not critical
    }

    const response: IcsoLeadResponse = {
      success: true,
      contactId: contact.id,
      message: 'Lead submitted successfully',
      calendarBookingUrl,
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error('[ICSO] Lead submission error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
