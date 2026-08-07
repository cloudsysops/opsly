import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const updateDealSchema = z.object({
  title: z.string().optional(),
  value: z.number().optional(),
  stage: z.enum(['lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost']).optional(),
  probability: z.number().optional(),
  close_date: z.string().datetime().optional(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantSlug = 'intcloudsysops';
  try {
    const { id } = await params;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('intcloudsysops_deals')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .eq('id', id)
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantSlug = 'intcloudsysops';
  try {
    const { id } = await params;
    const body = await request.json();
    const validated = updateDealSchema.parse(body);
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('intcloudsysops_deals')
      .update(validated)
      .eq('tenant_slug', tenantSlug)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Update failed' }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantSlug = 'intcloudsysops';
  try {
    const { id } = await params;
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase
      .from('intcloudsysops_deals')
      .delete()
      .eq('tenant_slug', tenantSlug)
      .eq('id', id);
    return NextResponse.json({ ok: true }, { status: 204 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Delete failed' }, { status: 400 });
  }
}
