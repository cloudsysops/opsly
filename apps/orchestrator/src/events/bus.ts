import { createClient } from "redis";
import type { OpslyEvent } from "./types.js";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

function buildClient() {
  return createClient({
    url: REDIS_URL,
    password: process.env.REDIS_PASSWORD,
  });
}

export interface EventSubscriptionHandle {
  close(): Promise<void>;
}

export async function publishEvent(
  event: OpslyEvent,
  data: Record<string, unknown>,
): Promise<void> {
  const publisher = buildClient();
  await publisher.connect();
  await publisher.publish(
    "opsly:events",
    JSON.stringify({
      event,
      data,
      timestamp: new Date().toISOString(),
    }),
  );
  await publisher.disconnect();
}

export async function subscribeEvents(
  handler: (event: OpslyEvent, data: Record<string, unknown>) => Promise<void>,
): Promise<EventSubscriptionHandle> {
  const subscriber = buildClient();
  await subscriber.connect();
  await subscriber.subscribe("opsly:events", async (message) => {
    const parsed = JSON.parse(message) as {
      event: OpslyEvent;
      data: Record<string, unknown>;
    };
    await handler(parsed.event, parsed.data);
  });

  return {
    async close(): Promise<void> {
      await subscriber.unsubscribe("opsly:events");
      if (subscriber.isOpen) {
        await subscriber.disconnect();
      }
    },
  };
}
