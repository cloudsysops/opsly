import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { NextRequest } from 'next/server';
import { requireAdminAccess } from '../../../../lib/auth';

type AgentRateLimit = {
  requests_per_minute: number;
  tokens_per_minute: number;
};

type AgentDefinition = {
  id: string;
  name: string;
  role: 'planner' | 'executor' | 'tool' | 'notifier';
  model: string;
  fallback_model: string;
  daily_budget_usd: number;
  local_only: boolean;
  rate_limit: AgentRateLimit;
  allowed_tools: string[];
  allowed_paths: string[];
};

type TeamConfig = {
  team: {
    name: string;
    description: string;
  };
  routing: {
    policy: string;
    providers: {
      primary: string;
      fallback: string[];
    };
  };
  constraints: {
    max_total_daily_budget_usd: number;
    max_concurrent_agents: number;
    require_approval_for: string[];
  };
  agents: AgentDefinition[];
};

function configCandidates(): string[] {
  return [
    path.resolve(process.cwd(), 'config', 'agents-team.json'),
    path.resolve(process.cwd(), '..', '..', 'config', 'agents-team.json'),
    path.resolve(process.cwd(), '..', '..', '..', 'config', 'agents-team.json'),
    '/opt/opsly/config/agents-team.json',
  ];
}

async function loadTeamConfig(): Promise<TeamConfig> {
  let lastError: unknown = null;

  for (const candidate of configCandidates()) {
    try {
      const raw = await readFile(candidate, 'utf8');
      const parsed = JSON.parse(raw) as TeamConfig;
      return parsed;
    } catch (error: unknown) {
      lastError = error;
    }
  }

  throw new Error(
    `agents-team.json not found/readable (${String(lastError ?? 'unknown error')})`,
  );
}

export async function GET(req: NextRequest): Promise<Response> {
  const authError = await requireAdminAccess(req);
  if (authError) {
    return authError;
  }

  try {
    const config = await loadTeamConfig();
    return Response.json({
      ...config,
      generated_at: new Date().toISOString(),
    });
  } catch (error: unknown) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : 'Unable to load agents team config',
      },
      { status: 500 },
    );
  }
}
