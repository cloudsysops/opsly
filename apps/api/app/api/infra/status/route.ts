import { NextResponse } from "next/server";

import {
    classifyHeartbeat,
    heartbeatKey,
    requireHeartbeatRedis,
    type ServiceHeartbeatStatus,
} from "../../../../lib/infra/heartbeat";

export const runtime = "nodejs";

const EXPECTED_SERVICES = ["api", "orchestrator"] as const;

export async function GET(): Promise<Response> {
  try {
    const redis = await requireHeartbeatRedis();
    const now = Date.now();
    const seen = new Set<string>();
    const services: ServiceHeartbeatStatus[] = [];

    for await (const key of redis.scanIterator({
      MATCH: "heartbeat:*",
      COUNT: 100,
    })) {
      if (typeof key !== "string") {
        continue;
      }
      const name = key.replace(/^heartbeat:/, "");
      seen.add(name);
      const [raw, ttl] = await Promise.all([redis.get(key), redis.ttl(key)]);
      services.push(classifyHeartbeat(name, raw, ttl, now));
    }

    for (const expected of EXPECTED_SERVICES) {
      if (seen.has(expected)) {
        continue;
      }
      const key = heartbeatKey(expected);
      const [raw, ttl] = await Promise.all([redis.get(key), redis.ttl(key)]);
      services.push(classifyHeartbeat(expected, raw, ttl, now));
    }

    const sortedServices = [...services].sort((a, b) =>
      a.name.localeCompare(b.name),
    );
    return NextResponse.json(
      {
        services: sortedServices,
        generated_at: new Date(now).toISOString(),
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "SYSTEM_UNREACHABLE",
        message: `infra status unavailable: ${message}`,
      },
      { status: 503 },
    );
  }
}
