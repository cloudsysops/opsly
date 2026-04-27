import { Queue } from 'bullmq';

import { getOpenclawQueueConnection } from '../../lib/redis-queue.js';

const SKILL_QUEUE_NAME = 'opsly-skills';

export function getSkillQueue(): Queue {
  const connection = getOpenclawQueueConnection();
  if (connection === null) {
    throw new Error('Redis not configured (REDIS_URL)');
  }
  return new Queue(SKILL_QUEUE_NAME, { connection });
}

export { SKILL_QUEUE_NAME };
