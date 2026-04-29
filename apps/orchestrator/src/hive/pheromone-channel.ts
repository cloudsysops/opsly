import { Redis } from 'ioredis';
import { createHiveRedisClient } from './redis.js';
import type { PheromoneMessage, PheromoneType } from './types.js';

const PHEROMONE_LOG_KEY = 'hive:pheromone_log';
const PHEROMONE_LOG_MAX = 1000;

export class PheromoneChannel {
  private readonly publisher: Redis;
  private readonly subscriber: Redis;

  constructor() {
    this.publisher = createHiveRedisClient();
    this.subscriber = createHiveRedisClient();
  }

  async publish(message: PheromoneMessage): Promise<void> {
    const channel = `hive:pheromone:${message.type}`;
    const serialized = JSON.stringify({
      ...message,
      timestamp: message.timestamp.toISOString(),
    });
    await this.publisher.publish(channel, serialized);
    await this.publisher.lpush(PHEROMONE_LOG_KEY, serialized);
    await this.publisher.ltrim(PHEROMONE_LOG_KEY, 0, PHEROMONE_LOG_MAX - 1);
  }

  async subscribe(
    botId: string,
    messageTypes: PheromoneType[],
    callback: (message: PheromoneMessage) => void
  ): Promise<void> {
    for (const type of messageTypes) {
      await this.subscriber.subscribe(`hive:pheromone:${type}`);
    }
    this.subscriber.on('message', (_channel, raw) => {
      try {
        const parsed = JSON.parse(raw) as PheromoneMessage;
        const to = parsed.to ?? parsed.recipientId;
        if (!to || to === botId || to === 'broadcast') {
          callback({
            ...parsed,
            timestamp: new Date(parsed.timestamp),
          });
        }
      } catch {
        // Ignore malformed pheromone messages
      }
    });
  }

  async close(): Promise<void> {
    await this.subscriber.quit();
    await this.publisher.quit();
  }
}
