import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "https://jkwykpldnitavhmtuzmo.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const supabase = createClient(supabaseUrl, supabaseKey);

export async function GET() {
  try {
    const { data: teams, error } = await supabase
      .schema("sandbox")
      .from("agent_task_results")
      .select("persona, run_id, tenant_slug, success, duration_ms, completed_at")
      .order("completed_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("[mission-control/teams] DB error:", error);
      return NextResponse.json({ teams: [], generated_at: new Date().toISOString() });
    }

    const teamMap = new Map<string, {
      name: string;
      status: "active" | "idle" | "error";
      lastTask: string | null;
      completedTasks: number;
      failedTasks: number;
      avgDurationMs: number;
    }>();

    for (const row of teams ?? []) {
      const existing = teamMap.get(row.persona) || {
        name: row.persona,
        status: "idle" as const,
        lastTask: null,
        completedTasks: 0,
        failedTasks: 0,
        avgDurationMs: 0,
        totalDuration: 0,
      };

      existing.lastTask = row.run_id;

      if (row.success) {
        existing.completedTasks++;
      } else {
        existing.failedTasks++;
      }

      existing.totalDuration = (existing.totalDuration || 0) + (row.duration_ms || 0);
      const total = existing.completedTasks + existing.failedTasks;
      existing.avgDurationMs = total > 0 ? Math.round(existing.totalDuration / total) : 0;

      existing.status = existing.failedTasks > existing.completedTasks * 0.5 ? "error" : 
                        existing.completedTasks > 0 ? "active" : "idle";

      teamMap.set(row.persona, existing);
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
    console.error("[mission-control/teams] Error:", err);
    return NextResponse.json({ teams: [], generated_at: new Date().toISOString() });
  }
}