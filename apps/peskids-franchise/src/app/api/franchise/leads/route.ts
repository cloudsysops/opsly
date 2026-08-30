import { NextRequest, NextResponse } from 'next/server';
import {
  FranchiseSessionError,
  resolveCanonicalFranchiseSession,
  unitIdsForScope,
} from '@/lib/franchise-session.server';

export const dynamic = 'force-dynamic';

type FranchiseLead = {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  status: string;
  service_mode: string | null;
  class_modality: string | null;
  neighborhood: string | null;
  created_at: string;
  franchise_id: string | null;
  franchise_name: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const { canonical, ui } = await resolveCanonicalFranchiseSession(request);
    const scope = unitIdsForScope(canonical);
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = Math.min(Number(searchParams.get('limit') ?? '50'), 200);
    const offset = Math.max(Number(searchParams.get('offset') ?? '0'), 0);

    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !key) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
    }

    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Fetch franchise name mapping
    let franchiseQuery = client
      .schema('platform')
      .from('peskids_franchises')
      .select('id, name')
      .eq('tenant_slug', 'peskids');

    if (scope !== 'all' && scope.length > 0) {
      franchiseQuery = franchiseQuery.in('id', scope);
    }

    const { data: franchises } = await franchiseQuery;
    const franchiseMap = new Map((franchises ?? []).map((f) => [f.id, f.name]));
    const franchiseIds = (franchises ?? []).map((f) => f.id);

    // Query leads
    let leadsQuery = client
      .schema('peskids')
      .from('leads')
      .select(
        'id, full_name, email, phone, status, service_mode, class_modality, neighborhood, created_at, franchise_id',
        { count: 'exact' }
      )
      .eq('tenant_slug', 'peskids')
      .order('created_at', { ascending: false });

    if (scope !== 'all') {
      if (franchiseIds.length === 0) {
        return NextResponse.json({ leads: [], total: 0, tenant: ui.tenant, unitScope: ui.unitScope });
      }
      leadsQuery = leadsQuery.in('franchise_id', franchiseIds);
    }

    if (status) {
      leadsQuery = leadsQuery.eq('status', status);
    }

    leadsQuery = leadsQuery.range(offset, offset + limit - 1);

    const { data: leads, error, count } = await leadsQuery;
    if (error) throw error;

    const enrichedLeads: FranchiseLead[] = (leads ?? []).map((lead) => ({
      id: lead.id,
      full_name: lead.full_name,
      email: lead.email,
      phone: lead.phone,
      status: lead.status,
      service_mode: lead.service_mode,
      class_modality: lead.class_modality,
      neighborhood: lead.neighborhood,
      created_at: lead.created_at,
      franchise_id: lead.franchise_id,
      franchise_name: lead.franchise_id ? franchiseMap.get(lead.franchise_id) ?? null : null,
    }));

    return NextResponse.json({
      tenant: ui.tenant,
      unitScope: ui.unitScope,
      leads: enrichedLeads,
      total: count ?? enrichedLeads.length,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof FranchiseSessionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[GET /api/franchise/leads]', error);
    return NextResponse.json({ error: 'Unable to load franchise leads' }, { status: 500 });
  }
}
