import { createClient } from 'redis';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

type MpcEvent = 'tenant.onboarded' | 'invite.sent';

export async function publishEvent(event: MpcEvent, data: Record<string, unknown>): Promise<void> {
  const publisher = createClient({
    url: REDIS_URL,
    password: process.env.REDIS_PASSWORD,
  });

  await publisher.connect();
  await publisher.publish(
    'opsly:events',
    JSON.stringify({ event, data, timestamp: new Date().toISOString() })
  );
  await publisher.disconnect();
}
