import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import type { PublishHistoryResponse } from '@/lib/render-status-types';

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
      .from('publish_records')
      .select(
        'id, render_id, approval_id, tenant_slug, workflow_id, workflow_name, status, version, published_at, published_by, rollback_at, rollback_reason, created_at, metadata',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const records = data ?? [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const published_today = records.filter((r) => r.status === 'published' && new Date(r.created_at) >= today).length;
    const failed_today = records.filter((r) => r.status === 'failed' && new Date(r.created_at) >= today).length;

    const response: PublishHistoryResponse = {
      records,
      total: count ?? 0,
      published_today,
      failed_today,
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
