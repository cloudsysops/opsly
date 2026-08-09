import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const updateContactSchema = z.object({
  email: z.string().email().optional(),
  phone: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  role: z.enum(['decision_maker', 'influencer', 'user', 'other']).optional(),
  status: z.enum(['active', 'inactive', 'archived']).optional(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const tenantSlug = 'intcloudsysops';
  try {
    const { id } = await params;
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('intcloudsysops_contacts')
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
    const validated = updateContactSchema.parse(body);
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('intcloudsysops_contacts')
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
      .from('intcloudsysops_contacts')
      .delete()
      .eq('tenant_slug', tenantSlug)
      .eq('id', id);
    return NextResponse.json({ ok: true }, { status: 204 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Delete failed' }, { status: 400 });
  }
}
