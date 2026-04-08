import type { NextRequest } from "next/server";
import { requireAdminToken } from "../../../../lib/auth";

const TOTAL_PARALLEL_CAPACITY = 8;

export async function GET(req: NextRequest): Promise<Response> {
  const authError = requireAdminToken(req);
  if (authError) return authError;

  return Response.json({
    teams: [
      {
        name: "frontend-team",
        specialization: "frontend",
        max_parallel: 2,
        handles: ["ui_fix", "style_change", "component_update"],
        status: "active",
      },
      {
        name: "backend-team",
        specialization: "backend",
        max_parallel: 3,
        handles: ["api_fix", "logic_change", "migration"],
        status: "active",
      },
      {
        name: "ml-team",
        specialization: "ml",
        max_parallel: 2,
        handles: ["model_update", "prompt_optimization", "cache_warming"],
        status: "active",
      },
      {
        name: "infra-team",
        specialization: "infra",
        max_parallel: 1,
        handles: ["deploy", "config_change", "scaling"],
        status: "active",
      },
    ],
    total_parallel_capacity: TOTAL_PARALLEL_CAPACITY,
    timestamp: new Date().toISOString(),
  });
}
