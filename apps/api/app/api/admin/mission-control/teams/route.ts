import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../../../../../lib/supabase/types';

function getSupabase(): SupabaseClient<Database> {
  const supabaseUrl = process.env.SUPABASE_URL ?? 'https://jkwykpldnitavhmtuzmo.supabase.co';
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  if (!supabaseKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  }
  return createClient<Database>(supabaseUrl, supabaseKey);
}

/** Umbral: si fallos > completed * ratio → status error. */
const FAILURE_DOMINANCE_RATIO = 0.5;

type TeamAgg = {
  name: string;
  status: 'active' | 'idle' | 'error';
  lastTask: string | null;
  completedTasks: number;
  failedTasks: number;
  avgDurationMs: number;
  totalDuration: number;
};

function initialTeam(persona: string): TeamAgg {
  return {
    name: persona,
    status: 'idle',
    lastTask: null,
    completedTasks: 0,
    failedTasks: 0,
    avgDurationMs: 0,
    totalDuration: 0,
  };
}

function statusFromCounts(completed: number, failed: number): TeamAgg['status'] {
  if (failed > completed * FAILURE_DOMINANCE_RATIO) {
    return 'error';
  }
  if (completed > 0) {
    return 'active';
  }
  return 'idle';
}

function applyResultRow(
  existing: TeamAgg,
  row: {
    success: boolean | null;
    duration_ms: number | null;
    run_id: string | null;
  }
): void {
  existing.lastTask = row.run_id;

  if (row.success) {
    existing.completedTasks += 1;
  } else {
    existing.failedTasks += 1;
  }

  existing.totalDuration += row.duration_ms ?? 0;
  const total = existing.completedTasks + existing.failedTasks;
  existing.avgDurationMs = total > 0 ? Math.round(existing.totalDuration / total) : 0;
  existing.status = statusFromCounts(existing.completedTasks, existing.failedTasks);
}

export async function GET(): Promise<Response> {
  try {
    const supabase = getSupabase();
    const { data: teams, error } = await supabase
      .schema('sandbox')
      .from('agent_task_results')
      .select('persona, run_id, tenant_slug, success, duration_ms, completed_at')
      .order('completed_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('[mission-control/teams] DB error:', error);
      return NextResponse.json({ teams: [], generated_at: new Date().toISOString() });
    }

    const teamMap = new Map<string, TeamAgg>();

    for (const row of teams ?? []) {
      const persona = row.persona ?? 'unknown';
      const existing = teamMap.get(persona) ?? initialTeam(persona);
      applyResultRow(existing, row);
      teamMap.set(persona, existing);
    }

    const result = Array.from(teamMap.values()).map((t) => ({
      name: t.name,
      status: t.status,
      lastTask: t.lastTask,
      completedTasks: t.completedTasks,
      failedTasks: t.failedTasks,
      avgDurationMs: t.avgDurationMs,
    }));

    return NextResponse.json({
      teams: result,
      generated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[mission-control/teams] Error:', err);
    return NextResponse.json({ teams: [], generated_at: new Date().toISOString() });
  }
}
