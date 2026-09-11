import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import type { RenderMonitorResponse } from '@/lib/render-status-types';

export async function GET(): Promise<NextResponse> {
  try {
    const { isAdminPublicDemoEnabled } = await import('@/lib/admin-public-demo');
    const publicDemo = isAdminPublicDemoEnabled();
    const userClient = await createServerSupabase();
    if (!publicDemo) {
      const {
        data: { user },
      } = await userClient.auth.getUser();
      if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) {
      return NextResponse.json(
        { error: 'Server missing SUPABASE_SERVICE_ROLE_KEY' },
        { status: 500 }
      );
    }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data, error, count } = await admin
      .schema('platform')
      .from('render_jobs')
      .select(
        'id, approval_id, tenant_slug, workflow_id, workflow_name, status, progress, started_at, completed_at, duration_seconds, error_message, output_url, created_at',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const jobs = data ?? [];
    const active = jobs.filter((j) => j.status === 'rendering' || j.status === 'queued').length;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completed_today = jobs.filter((j) => j.status === 'completed' && new Date(j.created_at) >= today).length;
    const failed_today = jobs.filter((j) => j.status === 'failed' && new Date(j.created_at) >= today).length;

    const durations = jobs
      .filter((j) => j.duration_seconds !== null)
      .map((j) => j.duration_seconds as number);
    const avg_duration_seconds = durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

    const response: RenderMonitorResponse = {
      jobs,
      total: count ?? 0,
      active,
      completed_today,
      failed_today,
      avg_duration_seconds,
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
