import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { runAILeadFollowupWorkflow, triggerFollowupForContact } from '@intcloudsysops/services/gohighlevel/index.js';

interface RequestBody {
  mode: 'batch' | 'single';
  tenantId: string;
  contactId?: string;
  filters?: {
    status?: 'lead' | 'prospect' | 'customer';
    source?: string;
    limit?: number;
  };
  messageContext?: {
    businessName?: string;
    ownerName?: string;
    serviceType?: string;
  };
}

serve(async (req: Request) => {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = (await req.json()) as RequestBody;

    // Validate required fields
    if (!body.tenantId) {
      return new Response(
        JSON.stringify({
          error: 'Missing required field: tenantId',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    let result;

    if (body.mode === 'single') {
      if (!body.contactId) {
        return new Response(JSON.stringify({ error: 'Missing required field: contactId' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      // Single contact follow-up
      result = await triggerFollowupForContact(body.tenantId, body.contactId, body.messageContext);
    } else {
      // Batch follow-up for multiple contacts
      result = await runAILeadFollowupWorkflow({
        tenantId: body.tenantId,
        filters: body.filters,
        messageContext: body.messageContext,
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    console.error('Edge function error:', errorMessage);

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
});
