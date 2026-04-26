import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

export async function GET(): Promise<NextResponse> {
  try {
    const publicDemo = process.env.NEXT_PUBLIC_ADMIN_PUBLIC_DEMO === 'true';
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

    const { data, error } = await admin
      .schema('platform')
      .from('approval_gate_decisions')
      .select(
        'id, sandbox_run_id, deployment_id, status, confidence, reasoning, recommendations, metrics, model_used, complexity, created_at'
      )
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ decisions: data ?? [] });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Internal error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
