import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const updateFollowupSchema = z.object({
  title: z.string().optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  due_at: z.string().datetime().optional(),
});

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  const tenantSlug = 'intcloudsysops';
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('intcloudsysops_followups')
      .select('*')
      .eq('tenant_slug', tenantSlug)
      .eq('id', params.id)
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Not found' }, { status: 404 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const tenantSlug = 'intcloudsysops';
  try {
    const body = await request.json();
    const validated = updateFollowupSchema.parse(body);
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase
      .from('intcloudsysops_followups')
      .update(validated)
      .eq('tenant_slug', tenantSlug)
      .eq('id', params.id)
      .select()
      .single();
    if (error) throw error;
    return NextResponse.json({ ok: true, data });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Update failed' }, { status: 400 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const tenantSlug = 'intcloudsysops';
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase
      .from('intcloudsysops_followups')
      .delete()
      .eq('tenant_slug', tenantSlug)
      .eq('id', params.id);
    return NextResponse.json({ ok: true }, { status: 204 });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Delete failed' }, { status: 400 });
  }
}
