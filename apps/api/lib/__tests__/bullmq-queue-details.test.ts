import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBullmqQueueDetails } from '../bullmq-queue-details';
import { getBullmqRedisConnection } from '../bullmq-redis';
import { getCache, setCache } from '../redis-cache';

const mQueue = {
  getWaitingCount: vi.fn(),
  getActiveCount: vi.fn(),
  close: vi.fn(),
};

vi.mock('bullmq', () => {
  return {
    Queue: vi.fn().mockImplementation(function() {
        return mQueue;
    }),
  };
});

vi.mock('../bullmq-redis', () => ({
  getBullmqRedisConnection: vi.fn(),
}));

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
}));

describe('getBullmqQueueDetails', () => {
  const mockConnection = { host: 'localhost', port: 6379 };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getBullmqRedisConnection).mockReturnValue(mockConnection);
    vi.mocked(getCache).mockResolvedValue(null);
  });

  it('fetches queue details from BullMQ when cache is empty', async () => {
    vi.mocked(mQueue.getWaitingCount).mockResolvedValue(10);
    vi.mocked(mQueue.getActiveCount).mockResolvedValue(5);

    const result = await getBullmqQueueDetails();

    expect(result.redis_available).toBe(true);
    expect(result.queues).toHaveLength(5); // Based on QUEUE_DEFS in bullmq-queue-details.ts
    expect(result.queues[0]).toEqual({
      id: 'openclaw',
      label: 'Orquestador OpenClaw',
      role: 'orchestrator',
      waiting: 10,
      active: 5,
    });

    // Should have called getWaitingCount and getActiveCount for each queue
    expect(mQueue.getWaitingCount).toHaveBeenCalledTimes(5);
    expect(mQueue.getActiveCount).toHaveBeenCalledTimes(5);
    expect(mQueue.close).toHaveBeenCalledTimes(5);
  });

  it('returns redis_available: false if no connection', async () => {
    vi.mocked(getBullmqRedisConnection).mockReturnValue(null);

    const result = await getBullmqQueueDetails();

    expect(result.redis_available).toBe(false);
    expect(result.queues).toEqual([]);
  });
});
