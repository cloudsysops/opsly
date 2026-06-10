import { type NextRequest, NextResponse } from 'next/server';
import { GoHighLevelClient, isGoHighLevelConfigured, resolveGoHighLevelEnv } from '@intcloudsysops/services/gohighlevel';

export const runtime = 'nodejs';

interface IcsoLeadRequest {
  name: string;
  email: string;
  message: string;
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

    return NextResponse.json(
      {
        success: true,
        contactId: contact.id,
        message: 'Lead submitted successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('[ICSO] Lead submission error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
