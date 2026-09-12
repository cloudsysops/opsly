import type { RouteContext } from '../router.js';
import { errorResponse, jsonResponse } from '../router.js';
import { verifyPlatformAdminToken } from '../utils.js';
import { readOrchestratorHeartbeat } from '../../infra/heartbeat.js';

const DEFAULT_SERVICES = ['mac-orchestrator', 'mac-local-agents-worker'];
const SERVICE_NAME_RE = /^[a-zA-Z0-9._:-]{1,128}$/;

function requestedServices(raw: string | undefined): string[] {
  const values = (raw ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const services = values.length > 0 ? values : DEFAULT_SERVICES;
  return [...new Set(services)].slice(0, 20);
}

export async function handleLocalHeartbeats(ctx: RouteContext): Promise<void> {
  if (!verifyPlatformAdminToken(ctx.req)) {
    errorResponse(ctx.res, 401, 'unauthorized');
    return;
  }

  const services = requestedServices(ctx.query.services);
  const invalid = services.find((service) => !SERVICE_NAME_RE.test(service));
  if (invalid) {
    errorResponse(ctx.res, 400, 'invalid heartbeat service name');
    return;
  }

  try {
    const heartbeats = await Promise.all(
      services.map((service) => readOrchestratorHeartbeat(service))
    );
    jsonResponse(ctx.res, 200, {
      ok: true,
      generated_at: new Date().toISOString(),
      heartbeats,
      all_alive: heartbeats.every((heartbeat) => heartbeat.alive),
    });
  } catch (error) {
    jsonResponse(ctx.res, 503, {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
      generated_at: new Date().toISOString(),
    });
  }
}
