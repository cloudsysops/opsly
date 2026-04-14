/**
 * Health mínimo para load balancers (sin I/O a Supabase).
 * Ver docs/GCP-STANDBY-CONFIG.md (OPSLY_STANDBY_ROLE).
 */
export async function GET(): Promise<Response> {
  return Response.json({
    status: 'ok' as const,
    mode: resolveStandbyMode(),
    timestamp: new Date().toISOString(),
  });
}

function resolveStandbyMode(): 'primary' | 'failover' {
  const role = process.env.OPSLY_STANDBY_ROLE?.trim().toLowerCase();
  if (role === 'gcp' || role === 'failover' || role === 'standby') {
    return 'failover';
  }
  const workerId = process.env.WORKER_ID ?? '';
  if (workerId.includes('gcp')) {
    return 'failover';
  }
  return 'primary';
}
