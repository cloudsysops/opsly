import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const createFollowupSchema = z.object({
  related_type: z.enum(['account', 'contact', 'deal', 'feedback']),
  related_id: z.string().uuid('Valid related ID required'),
  title: z.string().min(1, 'Followup title required'),
  description: z.string().optional(),
  due_at: z.string().datetime().optional(),
  assigned_to: z.string().min(1, 'Assigned to required'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).default('pending'),
  tags: z.array(z.string()).default([]),
});

export async function GET(request: NextRequest) {
  const tenantSlug = 'intcloudsysops';
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();
  const relatedType = request.nextUrl.searchParams.get('related_type');
  const relatedId = request.nextUrl.searchParams.get('related_id');
  const status = request.nextUrl.searchParams.get('status');

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    let query = supabase
      .from('intcloudsysops_followups')
      .select('*')
      .eq('tenant_slug', tenantSlug);

    if (relatedType) query = query.eq('related_type', relatedType);
    if (relatedId) query = query.eq('related_id', relatedId);
    if (status) query = query.eq('status', status);

    const { data, error } = await query.order('due_at', { ascending: true });

    if (error) throw error;

    return NextResponse.json({ ok: true, data }, { status: 200 });
  } catch (error) {
    console.error(`[${requestId}] followups GET failed`, error);
    return NextResponse.json(
      { ok: false, error: 'Failed to fetch followups', request_id: requestId },
      { status: 400 }
    );
  }
}

export async function POST(request: NextRequest) {
  const tenantSlug = 'intcloudsysops';
  const requestId = request.headers.get('x-request-id') || crypto.randomUUID();

  try {
    const body = await request.json();
    const validated = createFollowupSchema.parse(body);

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from('intcloudsysops_followups')
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
    console.error(`[${requestId}] followups POST failed`, error);
    return NextResponse.json(
      { ok: false, error: 'Failed to create followup', request_id: requestId },
      { status: 400 }
    );
  }
}
