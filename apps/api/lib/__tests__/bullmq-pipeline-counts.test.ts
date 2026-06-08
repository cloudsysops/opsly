import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Queue } from 'bullmq';

vi.mock('bullmq', () => {
  const QueueMock = vi.fn();
  QueueMock.prototype.getWaitingCount = vi.fn().mockResolvedValue(1);
  QueueMock.prototype.getActiveCount = vi.fn().mockResolvedValue(1);
  QueueMock.prototype.close = vi.fn().mockResolvedValue(undefined);
  return { Queue: QueueMock };
});

vi.mock('../bullmq-redis', () => ({
  getBullmqRedisConnection: vi.fn().mockReturnValue({ host: 'localhost', port: 6379 }),
}));

vi.mock('../redis-cache', () => ({
  getCache: vi.fn(),
  setCache: vi.fn(),
}));

import { getBullmqPipelineJobTotals } from '../bullmq-pipeline-counts';
import { getCache, setCache } from '../redis-cache';
import { getBullmqRedisConnection } from '../bullmq-redis';

describe('getBullmqPipelineJobTotals', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getBullmqRedisConnection).mockReturnValue({ host: 'localhost', port: 6379 });
  });

  it('returns cached totals if available', async () => {
    const mockCached = {
      openclaw_total: 10,
      teams_total: 20,
      all_queues_total: 30,
    };
    vi.mocked(getCache).mockResolvedValue(mockCached);

    const result = await getBullmqPipelineJobTotals();

    expect(result).toEqual(mockCached);
    expect(getCache).toHaveBeenCalledWith('metrics:bullmq:totals');
    expect(Queue).not.toHaveBeenCalled();
  });

  it('fetches from BullMQ and sets cache if not cached', async () => {
    vi.mocked(getCache).mockResolvedValue(null);
    vi.mocked(setCache).mockResolvedValue(true);

    const result = await getBullmqPipelineJobTotals();

    expect(result).not.toBeNull();
    expect(result).toEqual({
      openclaw_total: 2,
      teams_total: 8,
      all_queues_total: 10,
    });
    expect(getCache).toHaveBeenCalledWith('metrics:bullmq:totals');
    expect(setCache).toHaveBeenCalledWith('metrics:bullmq:totals', expect.anything(), 60);
    expect(Queue).toHaveBeenCalledTimes(5);
  });

  it('returns null if Redis connection is missing', async () => {
    vi.mocked(getBullmqRedisConnection).mockReturnValue(null);

    const result = await getBullmqPipelineJobTotals();
    expect(result).toBeNull();
  });

  it('handles errors by returning null', async () => {
    vi.mocked(getCache).mockRejectedValue(new Error('Redis down'));
    const result = await getBullmqPipelineJobTotals();
    expect(result).toBeNull();
  });
});
