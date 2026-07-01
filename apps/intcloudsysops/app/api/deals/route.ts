import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const createDealSchema = z.object({
  account_id: z.string().uuid('Valid account ID required'),
  title: z.string().min(1, 'Deal title required'),
  value: z.number().positive('Deal value must be positive'),
  currency: z.string().length(3).default('USD'),
  stage: z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']),
  probability: z.number().min(0).max(100).default(0),
  close_date: z.string().datetime().optional(),
  owner: z.string().min(1, 'Deal owner required'),
  description: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const tenantSlug = 'intcloudsysops';
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const accountId = request.nextUrl.searchParams.get('account_id');
  const stage = request.nextUrl.searchParams.get('stage');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    let query = supabase
      .from('intcloudsysops_deals')
      .select('*')
      .eq('tenant_slug', tenantSlug);

    if (accountId) query = query.eq('account_id', accountId);
    if (stage) query = query.eq('stage', stage);

    const { data, error } = await query.order('close_date', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    console.error(`[${requestId}] deals GET failed`, error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch deals', request_id: requestId },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  const tenantSlug = 'intcloudsysops';
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const body = await request.json();
    const validated = createDealSchema.parse(body);

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('intcloudsysops_deals')
      .insert([
        {
          ...validated,
          tenant_slug: tenantSlug,
        },
      ])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ ok: true, data }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { ok: false, error: 'Validation error', details: error.errors, request_id: requestId },
        { status: 400 }
      );
    }
    console.error(`[${requestId}] deals POST failed`, error);
    return NextResponse.json(
      { ok: false, error: 'Failed to create deal', request_id: requestId },
      { status: 400 }
    );
  }
}
