import type { NextRequest } from 'next/server';
import { getServiceClient } from '../../../../lib/supabase';
import type { Database } from '../../../../lib/supabase';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const auth = request.headers.get('authorization');
  const bearer = auth?.startsWith('Bearer ') ? auth.slice(7).trim() : null;
  const header = request.headers.get('x-cron-secret');
  return (bearer ?? header ?? '') === secret;
}

type RetentionScheduleRow = {
  id: string;
  tenant_id: string;
  schema_name: string;
  table_name: string;
  date_column: string;
  ttl_days: number;
  action: string;
};

type RunResult = {
  schedule_id: string;
  tenant_id: string;
  table: string;
  rows_affected: number;
  action: string;
  dry_run: boolean;
  error?: string;
};

async function processRetentionSchedule(
  schedule: RetentionScheduleRow,
  client: ReturnType<typeof getServiceClient>,
  dryRun: boolean
): Promise<RunResult> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - schedule.ttl_days);
  const schemaName = schedule.schema_name as keyof Database;

  if (dryRun) {
    const { count, error } = await client
      .schema(schemaName)
      .from(schedule.table_name)
      .select('*', { count: 'exact', head: true })
      .lt(schedule.date_column, cutoff.toISOString());

    return {
      schedule_id: schedule.id,
      tenant_id: schedule.tenant_id,
      table: `${schedule.schema_name}.${schedule.table_name}`,
      rows_affected: count ?? 0,
      action: schedule.action,
      dry_run: true,
      error: error?.message,
    };
  }

  if (schedule.action === 'delete') {
    const { error, count } = await client
      .schema(schemaName)
      .from(schedule.table_name)
      .delete({ count: 'exact' })
      .lt(schedule.date_column, cutoff.toISOString());

    return {
      schedule_id: schedule.id,
      tenant_id: schedule.tenant_id,
      table: `${schedule.schema_name}.${schedule.table_name}`,
      rows_affected: count ?? 0,
      action: schedule.action,
      dry_run: false,
      error: error?.message,
    };
  }

  return {
    schedule_id: schedule.id,
    tenant_id: schedule.tenant_id,
    table: `${schedule.schema_name}.${schedule.table_name}`,
    rows_affected: 0,
    action: schedule.action,
    dry_run: dryRun,
    error: 'Action not implemented',
  };
}

export async function GET(request: NextRequest): Promise<Response> {
  if (!isAuthorized(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const dryRun = request.nextUrl.searchParams.get('dry_run') !== 'false';
  const client = getServiceClient();

  const { data: schedules, error: fetchError } = await client
    .schema('governance')
    .from('retention_schedule')
    .select('id, tenant_id, schema_name, table_name, date_column, ttl_days, action')
    .eq('is_active', true);

  if (fetchError) {
    console.error('[cron][retention] failed to fetch schedules', fetchError);
    return Response.json({ error: 'Failed to fetch retention schedules' }, { status: 500 });
  }

  const results: RunResult[] = [];
  for (const schedule of (schedules as RetentionScheduleRow[]) ?? []) {
    const result = await processRetentionSchedule(schedule, client, dryRun);
    results.push(result);
  }

  console.info('[cron][retention] completed', { dry_run: dryRun, schedules: results.length });

  return Response.json({
    ok: true,
    dry_run: dryRun,
    ran_at: new Date().toISOString(),
    results,
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  return GET(request);
}
