import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase/server';

function utcDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function demoAuditLog(): NextResponse {
  const now = new Date();
  const entries = [
    {
      id: 'demo-audit-1',
      action: 'workflow_pack.installed',
      actor: 'opsly-local-demo',
      created_at: now.toISOString(),
      tenant_slug: 'smiletripcare',
    },
    {
      id: 'demo-audit-2',
      action: 'agent_supervisor.heartbeat',
      actor: 'opsly-local-demo',
      created_at: new Date(now.getTime() - 60 * 60 * 1000).toISOString(),
      tenant_slug: null,
    },
  ];
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - (6 - index));
    return { date: utcDay(d), count: index === 6 ? entries.length : 0 };
  });
  return NextResponse.json({ entries, buckets, demo: true });
}

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
      return demoAuditLog();
    }

    const admin = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: logs, error } = await admin
      .schema('platform')
      .from('audit_log')
      .select('id, action, actor, metadata, created_at, tenant_id')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const rows = logs ?? [];
    const tenantIds = [
      ...new Set(
        rows
          .map((r) => r.tenant_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      ),
    ];

    const slugById = new Map<string, string>();
    if (tenantIds.length > 0) {
      const { data: tenants } = await admin
        .schema('platform')
        .from('tenants')
        .select('id, slug')
        .in('id', tenantIds);
      for (const t of tenants ?? []) {
        slugById.set(t.id, t.slug);
      }
    }

    const entries = rows.slice(0, 20).map((r) => {
      const meta = r.metadata as Record<string, unknown> | null;
      const slugFromMeta = meta && typeof meta.slug === 'string' ? meta.slug : null;
      const tid = r.tenant_id;
      const slug = tid && slugById.has(tid) ? (slugById.get(tid) ?? null) : slugFromMeta;
      return {
        id: r.id,
        action: r.action,
        actor: r.actor,
        created_at: r.created_at,
        tenant_slug: slug,
      };
    });

    const now = new Date();
    const bucketMap = new Map<string, number>();
    for (let i = 0; i < 7; i += 1) {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - i);
      bucketMap.set(utcDay(d), 0);
    }
    for (const r of rows) {
      const day = utcDay(new Date(r.created_at));
      if (bucketMap.has(day)) {
        bucketMap.set(day, (bucketMap.get(day) ?? 0) + 1);
      }
    }
    const buckets = [...bucketMap.entries()].map(([date, count]) => ({ date, count })).reverse();

    return NextResponse.json({ entries, buckets });
  } catch (e) {
    return demoAuditLog();
  }
}
