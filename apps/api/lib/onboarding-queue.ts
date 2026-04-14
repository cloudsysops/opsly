import { Queue } from 'bullmq';
import { getBullmqRedisConnection } from './bullmq-redis';

let onboardingQueue: Queue | null = null;

export function getOnboardingQueue(): Queue {
  if (!onboardingQueue) {
    const connection = getBullmqRedisConnection();
    if (!connection) {
      throw new Error('REDIS_URL environment variable is not configured');
    }

    onboardingQueue = new Queue('onboarding', {
      connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
      },
    });
  }

  return onboardingQueue;
}
