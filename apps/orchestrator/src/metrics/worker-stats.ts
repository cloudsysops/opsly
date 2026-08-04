import Redis from 'ioredis';
import { DistributedTracer } from '@intcloudsysops/observability';

export interface WorkerStats {
  workerName: string;
  totalJobs: number;
  successfulJobs: number;
  failedJobs: number;
  retriedJobs: number;
  averageDuration: number;
  p95Duration: number;
  p99Duration: number;
  errorRate: number;
  retryRate: number;
  throughput: number; // jobs/minute
  lastUpdated: Date;
}

export class WorkerStatsCollector {
  private redis: Redis;
  private readonly prefix = 'stats:worker:';

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async recordJobCompletion(
    workerName: string,
    duration: number,
    success: boolean,
    retried: boolean = false
  ): Promise<void> {
    const key = `${this.prefix}${workerName}`;

    // Increment counters
    await this.redis.hincrby(
      key,
      'totalJobs',
      1
    );

    if (success) {
      await this.redis.hincrby(key, 'successfulJobs', 1);
    } else {
      await this.redis.hincrby(key, 'failedJobs', 1);
    }

    if (retried) {
      await this.redis.hincrby(key, 'retriedJobs', 1);
    }

    // Store duration for percentile calculation
    await this.redis.lpush(
      `${this.prefix}${workerName}:durations`,
      duration.toString()
    );

    // Keep only last 1000 duration samples
    await this.redis.ltrim(
      `${this.prefix}${workerName}:durations`,
      0,
      999
    );

    // Update last updated timestamp
    await this.redis.hset(key, 'lastUpdated', Date.now().toString());

    // Set TTL for stats (1 hour)
    await this.redis.expire(key, 3600);
  }

  async getWorkerStats(workerName: string): Promise<WorkerStats | null> {
    const key = `${this.prefix}${workerName}`;
    const statsData = await this.redis.hgetall(key);

    if (Object.keys(statsData).length === 0) {
      return null;
    }

    const totalJobs = parseInt(statsData.totalJobs || '0', 10);
    const successfulJobs = parseInt(statsData.successfulJobs || '0', 10);
    const failedJobs = parseInt(statsData.failedJobs || '0', 10);
    const retriedJobs = parseInt(statsData.retriedJobs || '0', 10);

    // Get duration samples
    const durations = await this.redis.lrange(
      `${this.prefix}${workerName}:durations`,
      0,
      -1
    );

    const durationNumbers = durations
      .map((d) => parseInt(d, 10))
      .sort((a, b) => a - b);

    const averageDuration =
      durationNumbers.length > 0
        ? durationNumbers.reduce((a, b) => a + b, 0) / durationNumbers.length
        : 0;

    const p95Index = Math.floor(durationNumbers.length * 0.95);
    const p99Index = Math.floor(durationNumbers.length * 0.99);

    return {
      workerName,
      totalJobs,
      successfulJobs,
      failedJobs,
      retriedJobs,
      averageDuration,
      p95Duration: durationNumbers[p95Index] || 0,
      p99Duration: durationNumbers[p99Index] || 0,
      errorRate: totalJobs > 0 ? failedJobs / totalJobs : 0,
      retryRate: totalJobs > 0 ? retriedJobs / totalJobs : 0,
      throughput:
        durationNumbers.length > 0
          ? (durationNumbers.length / (60 * 1000)) * 60
          : 0, // Rough estimate
      lastUpdated: new Date(
        parseInt(statsData.lastUpdated || Date.now().toString(), 10)
      ),
    };
  }

  async getAllWorkerStats(): Promise<WorkerStats[]> {
    const keys = await this.redis.keys(`${this.prefix}*`);
    const workerNames = new Set(
      keys
        .filter((k) => !k.endsWith(':durations'))
        .map((k) => k.replace(this.prefix, ''))
    );

    const stats: WorkerStats[] = [];
    for (const workerName of workerNames) {
      const workerStats = await this.getWorkerStats(workerName);
      if (workerStats) {
        stats.push(workerStats);
      }
    }

    return stats;
  }

  async resetWorkerStats(workerName: string): Promise<void> {
    const key = `${this.prefix}${workerName}`;
    await this.redis.del(key);
    await this.redis.del(`${this.prefix}${workerName}:durations`);
  }

  async getHealthMetrics(): Promise<{
    totalActiveJobs: number;
    workerStats: WorkerStats[];
    systemMetrics: Record<string, any>;
  }> {
    const allStats = await this.getAllWorkerStats();
    const totalActiveJobs = DistributedTracer.getActiveTracesCount();

    return {
      totalActiveJobs,
      workerStats: allStats,
      systemMetrics: {
        timestamp: new Date(),
        totalTracedJobs: DistributedTracer.getCompletedTracesCount(),
        averageErrorRate:
          allStats.length > 0
            ? allStats.reduce((sum, s) => sum + s.errorRate, 0) / allStats.length
            : 0,
        averageRetryRate:
          allStats.length > 0
            ? allStats.reduce((sum, s) => sum + s.retryRate, 0) / allStats.length
            : 0,
      },
    };
  }
}

export let globalStatsCollector: WorkerStatsCollector | null = null;

export function initializeStatsCollector(redis: Redis): WorkerStatsCollector {
  globalStatsCollector = new WorkerStatsCollector(redis);
  return globalStatsCollector;
}

export function getStatsCollector(): WorkerStatsCollector {
  if (!globalStatsCollector) {
    throw new Error('Stats collector not initialized');
  }
  return globalStatsCollector;
}
