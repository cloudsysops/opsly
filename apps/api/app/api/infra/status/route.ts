import { NextResponse } from 'next/server';

import {
  classifyHeartbeat,
  heartbeatKey,
  requireHeartbeatRedis,
  type ServiceHeartbeatStatus,
} from '../../../../lib/infra/heartbeat';
import { runTrustedPortalDal } from '../../../../lib/portal-tenant-dal';

export const runtime = 'nodejs';

const EXPECTED_SERVICES = ['api', 'orchestrator'] as const;

export async function GET(request: Request): Promise<Response> {
  const out = await runTrustedPortalDal(request, async (_session) => {
    try {
      const redis = await requireHeartbeatRedis();
      const now = Date.now();
      const keysToFetch = new Set<string>();

      // Bolt Optimization: Correctly handle scanIterator (yields strings)
      // and collect all keys first to perform batched MGET.
      for await (const key of redis.scanIterator({
        MATCH: 'heartbeat:*',
        COUNT: 100,
      })) {
        if (typeof key === 'string') {
          keysToFetch.add(key);
        }
      }

      // Ensure expected services are included
      for (const expected of EXPECTED_SERVICES) {
        keysToFetch.add(heartbeatKey(expected));
      }

      const keysArray = Array.from(keysToFetch);
      if (keysArray.length === 0) {
        return NextResponse.json({ services: [], generated_at: new Date(now).toISOString() });
      }

      // Bolt Optimization: Batch GET calls using MGET (O(1) roundtrip)
      // and parallelize TTL calls to minimize latency.
      const [rawValues, ttls] = await Promise.all([
        redis.mGet(keysArray),
        Promise.all(keysArray.map((k) => redis.ttl(k))),
      ]);

      const services: ServiceHeartbeatStatus[] = keysArray.map((key, i) => {
        const name = key.replace(/^heartbeat:/, '');
        return classifyHeartbeat(name, rawValues[i], ttls[i], now);
      });

      const sortedServices = [...services].sort((a, b) => a.name.localeCompare(b.name));
      return NextResponse.json(
        {
          services: sortedServices,
          generated_at: new Date(now).toISOString(),
        },
        { status: 200 }
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        {
          error: 'SYSTEM_UNREACHABLE',
          message: `infra status unavailable: ${message}`,
        },
        { status: 503 }
      );
    }
  });
  return out;
}
