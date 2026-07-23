import peskidsPkg from '../../../package.json';
import { buildPeskidsProObservability } from '@/lib/observability/peskids-pro-health';

function resolveVersion(): string {
  return typeof peskidsPkg.version === 'string' ? peskidsPkg.version : '0.0.0';
}

export async function GET(): Promise<Response> {
  return Response.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: resolveVersion(),
    service: 'peskids',
    observability: buildPeskidsProObservability(),
  });
}
