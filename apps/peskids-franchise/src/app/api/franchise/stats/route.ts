import { NextRequest, NextResponse } from 'next/server';
import {
  FranchiseSessionError,
  resolveCanonicalFranchiseSession,
  unitIdsForScope,
} from '@/lib/franchise-session.server';

export const dynamic = 'force-dynamic';

type FranchiseStats = {
  tenant: string;
  unitScope: 'all' | string[];
  totals: {
    leads: number;
    students: number;
    classes: number;
    activeStudents: number;
  };
  byUnit: Array<{
    franchiseId: string;
    slug: string;
    name: string;
    leads: number;
    students: number;
    activeStudents: number;
  }>;
  recentActivity: {
    leadsThisWeek: number;
    studentsThisWeek: number;
    trialsThisWeek: number;
  };
};

export async function GET(request: NextRequest) {
  try {
    const { canonical, ui } = await resolveCanonicalFranchiseSession(request);
    const scope = unitIdsForScope(canonical);

    // Import Supabase service client
    const { createClient } = await import('@supabase/supabase-js');
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !key) {
      return NextResponse.json({ error: 'Service not configured' }, { status: 503 });
    }

    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch franchises for name mapping
    let franchiseQuery = client
      .schema('platform')
      .from('peskids_franchises')
      .select('id, slug, name')
      .eq('tenant_slug', 'peskids')
      .eq('status', 'active');

    if (scope !== 'all') {
      if (scope.length === 0) {
        return NextResponse.json({
          tenant: ui.tenant,
          unitScope: ui.unitScope,
          totals: { leads: 0, students: 0, classes: 0, activeStudents: 0 },
          byUnit: [],
          recentActivity: { leadsThisWeek: 0, studentsThisWeek: 0, trialsThisWeek: 0 },
        });
      }
      franchiseQuery = franchiseQuery.in('id', scope);
    }

    const { data: franchises, error: franchisesError } = await franchiseQuery;
    if (franchisesError) throw franchisesError;

    const franchiseMap = new Map((franchises ?? []).map((f) => [f.id, f]));
    const franchiseIds = (franchises ?? []).map((f) => f.id);

    // Parallel queries for stats
    const [leadsResult, studentsResult, classesResult] = await Promise.all([
      // Leads count (with franchise_id)
      client
        .schema('peskids')
        .from('leads')
        .select('id, franchise_id, created_at', { count: 'exact', head: false })
        .eq('tenant_slug', 'peskids')
        .then((res) => {
          if (res.error) return { data: [], count: 0 };
          const rows = (res.data ?? []) as Array<{ id: string; franchise_id: string | null; created_at: string }>;
          return {
            data: rows,
            count: rows.length,
            thisWeek: rows.filter((r) => r.created_at >= weekAgo).length,
          };
        }),

      // Students count
      client
        .schema('peskids')
        .from('students')
        .select('id, franchise_id, status', { count: 'exact', head: false })
        .eq('tenant_slug', 'peskids')
        .then((res) => {
          if (res.error) return { data: [], count: 0 };
          const rows = (res.data ?? []) as Array<{
            id: string;
            franchise_id: string | null;
            status: string;
            created_at: string;
          }>;
          return {
            data: rows,
            count: rows.length,
            active: rows.filter((r) => r.status === 'active').length,
            thisWeek: rows.filter((r) => (r as any).created_at >= weekAgo).length,
          };
        }),

      // Classes count
      client
        .schema('peskids')
        .from('classes')
        .select('id, franchise_id', { count: 'exact', head: false })
        .eq('tenant_slug', 'peskids')
        .then((res) => {
          if (res.error) return { data: [], count: 0 };
          const rows = (res.data ?? []) as Array<{ id: string; franchise_id: string | null }>;
          return { data: rows, count: rows.length };
        }),
    ]);

    // Filter by franchise scope
    const filterByScope = <T extends { franchise_id?: string | null }>(rows: T[]): T[] => {
      if (scope === 'all') return rows;
      return rows.filter((r) => r.franchise_id && scope.includes(r.franchise_id));
    };

    const scopedLeads = filterByScope(leadsResult.data);
    const scopedStudents = filterByScope(studentsResult.data);
    const scopedClasses = filterByScope(classesResult.data);

    // Build per-unit breakdown
    const byUnit = franchiseIds.map((franchiseId) => {
      const franchise = franchiseMap.get(franchiseId);
      const unitLeads = scopedLeads.filter((l) => l.franchise_id === franchiseId);
      const unitStudents = scopedStudents.filter((s) => s.franchise_id === franchiseId);
      return {
        franchiseId,
        slug: franchise?.slug ?? franchiseId,
        name: franchise?.name ?? franchiseId,
        leads: unitLeads.length,
        students: unitStudents.length,
        activeStudents: unitStudents.filter((s) => s.status === 'active').length,
      };
    });

    return NextResponse.json({
      tenant: ui.tenant,
      unitScope: ui.unitScope,
      totals: {
        leads: scopedLeads.length,
        students: scopedStudents.length,
        classes: scopedClasses.length,
        activeStudents: scopedStudents.filter((s) => s.status === 'active').length,
      },
      byUnit,
      recentActivity: {
        leadsThisWeek: scopedLeads.filter((l) => l.created_at >= weekAgo).length,
        studentsThisWeek: scopedStudents.filter((s) => (s as any).created_at >= weekAgo).length,
        trialsThisWeek: 0,
      },
    });
  } catch (error) {
    if (error instanceof FranchiseSessionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[GET /api/franchise/stats]', error);
    return NextResponse.json({ error: 'Unable to load franchise stats' }, { status: 500 });
  }
}
