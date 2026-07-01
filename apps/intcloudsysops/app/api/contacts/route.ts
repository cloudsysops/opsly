import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const createContactSchema = z.object({
  account_id: z.string().uuid('Valid account ID required'),
  email: z.string().email(),
  phone: z.string().optional(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  role: z.enum(['decision_maker', 'influencer', 'user', 'other']),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const tenantSlug = 'intcloudsysops';
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const accountId = request.nextUrl.searchParams.get('account_id');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    let query = supabase
      .from('intcloudsysops_contacts')
      .select('*')
      .eq('tenant_slug', tenantSlug);

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    console.error(`[${requestId}] contacts GET failed`, error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch contacts', request_id: requestId },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  const tenantSlug = 'intcloudsysops';
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const body = await request.json();
    const validated = createContactSchema.parse(body);

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('intcloudsysops_contacts')
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
    console.error(`[${requestId}] contacts POST failed`, error);
    return NextResponse.json(
      { ok: false, error: 'Failed to create contact', request_id: requestId },
      { status: 400 }
    );
  }
}
