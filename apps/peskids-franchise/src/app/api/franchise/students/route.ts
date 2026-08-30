import { NextRequest, NextResponse } from 'next/server';
import {
  FranchiseSessionError,
  resolveCanonicalFranchiseSession,
  unitIdsForScope,
} from '@/lib/franchise-session.server';

export const dynamic = 'force-dynamic';

type FranchiseStudent = {
  id: string;
  full_name: string;
  parent_email: string | null;
  grade: string | null;
  status: string;
  enrollment_date: string | null;
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

    // Query students
    let studentsQuery = client
      .schema('peskids')
      .from('students')
      .select(
        'id, full_name, parent_email, grade, status, enrollment_date, franchise_id',
        { count: 'exact' }
      )
      .eq('tenant_slug', 'peskids')
      .order('enrollment_date', { ascending: false });

    if (scope !== 'all') {
      if (franchiseIds.length === 0) {
        return NextResponse.json({
          students: [],
          total: 0,
          tenant: ui.tenant,
          unitScope: ui.unitScope,
        });
      }
      studentsQuery = studentsQuery.in('franchise_id', franchiseIds);
    }

    if (status) {
      studentsQuery = studentsQuery.eq('status', status);
    }

    studentsQuery = studentsQuery.range(offset, offset + limit - 1);

    const { data: students, error, count } = await studentsQuery;
    if (error) throw error;

    const enrichedStudents: FranchiseStudent[] = (students ?? []).map((student) => ({
      id: student.id,
      full_name: student.full_name,
      parent_email: student.parent_email,
      grade: student.grade,
      status: student.status,
      enrollment_date: student.enrollment_date,
      franchise_id: student.franchise_id,
      franchise_name: student.franchise_id
        ? franchiseMap.get(student.franchise_id) ?? null
        : null,
    }));

    return NextResponse.json({
      tenant: ui.tenant,
      unitScope: ui.unitScope,
      students: enrichedStudents,
      total: count ?? enrichedStudents.length,
      limit,
      offset,
    });
  } catch (error) {
    if (error instanceof FranchiseSessionError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[GET /api/franchise/students]', error);
    return NextResponse.json({ error: 'Unable to load franchise students' }, { status: 500 });
  }
}
