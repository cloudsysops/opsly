import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';
import type { ApprovalQueueResponse } from '@/lib/render-status-types';

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
      .from('approval_queue')
      .select(
        'id, request_id, tenant_slug, workflow_id, workflow_name, status, priority, confidence, reasoning, requester_email, reviewer_email, created_at, updated_at, resolved_at, metadata',
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const pending = data?.filter((d) => d.status === 'pending').length ?? 0;
    const in_review = data?.filter((d) => d.status === 'in_review').length ?? 0;
    const approved = data?.filter((d) => d.status === 'approved').length ?? 0;
    const rejected = data?.filter((d) => d.status === 'rejected').length ?? 0;

    const response: ApprovalQueueResponse = {
      items: data ?? [],
      total: count ?? 0,
      pending,
      in_review,
      approved,
      rejected,
      generated_at: new Date().toISOString(),
    };

    return NextResponse.json(response);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
