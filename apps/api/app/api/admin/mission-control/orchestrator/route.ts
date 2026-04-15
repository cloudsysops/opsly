import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL ?? "https://jkwykpldnitavhmtuzmo.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

function getRedisUrl(): string {
  return process.env.REDIS_URL ?? "redis://:fc115c2bc751bf11da99b9f2768ed55d896c79efcaeff777@redis:6379/0";
}

async function getRedisClient() {
  const { createClient: createRedis } = await import("redis");
  return createRedis({ url: getRedisUrl() });
}

export async function GET() {
  try {
    const redis = await getRedisClient();
    await redis.connect();

    const [waiting, active, completed, failed] = await Promise.all([
      redis.lLen("bull:openclaw:wait"),
      redis.lLen("bull:openclaw:active"),
      redis.lLen("bull:openclaw:completed"),
      redis.lLen("bull:openclaw:failed"),
    ]);

    await redis.disconnect();

    const mode = process.env.OPSLY_ORCHESTRATOR_MODE ?? "worker-enabled";
    const role = mode === "worker-enabled" ? "worker" : "control";

    const workers: Record<string, { concurrency: number; active: number }> = {
      ollama: { concurrency: parseInt(process.env.ORCHESTRATOR_OLLAMA_CONCURRENCY ?? "2"), active: 0 },
      cursor: { concurrency: parseInt(process.env.ORCHESTRATOR_CURSOR_CONCURRENCY ?? "2"), active: 0 },
      n8n: { concurrency: parseInt(process.env.ORCHESTRATOR_N8N_CONCURRENCY ?? "2"), active: 0 },
      drive: { concurrency: parseInt(process.env.ORCHESTRATOR_DRIVE_CONCURRENCY ?? "1"), active: 0 },
      notify: { concurrency: parseInt(process.env.ORCHESTRATOR_NOTIFY_CONCURRENCY ?? "3"), active: 0 },
    };

    return NextResponse.json({
      mode,
      role,
      workers,
      queue: {
        waiting,
        active,
        completed,
        failed,
      },
    });
  } catch (err) {
    console.error("[mission-control/orchestrator] Error:", err);
    return NextResponse.json({
      mode: "unknown",
      role: "unknown",
      workers: {},
      queue: { waiting: 0, active: 0, completed: 0, failed: 0 },
    });
  }
}