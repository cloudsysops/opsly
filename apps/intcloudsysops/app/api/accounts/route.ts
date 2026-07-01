import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const createAccountSchema = z.object({
  name: z.string().min(1, 'Account name required'),
  account_type: z.enum(['prospect', 'customer', 'partner', 'vendor']),
  status: z.enum(['active', 'inactive', 'archived']).default('active'),
  billing_email: z.string().email().optional(),
  website: z.string().url().optional(),
  industry: z.string().optional(),
  employee_count: z.number().int().positive().optional(),
});

export async function GET(request: NextRequest) {
  const tenantSlug = 'intcloudsysops';
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('intcloudsysops_accounts')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    console.error(`[${requestId}] accounts GET failed`, error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch accounts', request_id: requestId },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  const tenantSlug = 'intcloudsysops';
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const body = await request.json();
    const validated = createAccountSchema.parse(body);

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('intcloudsysops_accounts')
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
    console.error(`[${requestId}] accounts POST failed`, error);
    return NextResponse.json(
      { ok: false, error: 'Failed to create account', request_id: requestId },
      { status: 400 }
    );
  }
}
