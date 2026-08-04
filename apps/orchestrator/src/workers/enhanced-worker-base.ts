import { Worker, Job, Queue } from 'bullmq';
import Redis from 'ioredis';
import { classifyError } from '@intcloudsysops/orchestrator-error-classifier';
import { DistributedTracer, createJobTraceLogger } from '@intcloudsysops/observability';
import { getStatsCollector } from '../metrics/worker-stats';
import { createLogger } from '@intcloudsysops/observability';

export interface OrchestratorJob {
  tenant_slug: string;
  type: string;
  job_id: string;
  [key: string]: any;
}

export interface WorkerOptions {
  connection: Redis;
  concurrency?: number;
  lockDuration?: number;
  lockRenewTime?: number;
  maxStalledCount?: number;
  maxStalledInterval?: number;
  stalledInterval?: number;
  maxRetriesPerStalledCount?: number;
}

export abstract class EnhancedWorkerBase {
  protected worker: Worker<OrchestratorJob>;
  protected repairQueue: Queue<OrchestratorJob> | null = null;
  protected logger = createLogger('EnhancedWorkerBase');
  protected readonly maxRepairAttempts = 3;

  constructor(
    protected queueName: string,
    protected handler: (job: Job<OrchestratorJob>) => Promise<void>,
    protected opts: WorkerOptions & { concurrency?: number }
  ) {
    this.worker = new Worker<OrchestratorJob>(
      queueName,
      (job) => this.processJob(job),
      {
        connection: opts.connection,
        concurrency: opts.concurrency || 2,
        lockDuration: opts.lockDuration || 30000,
        lockRenewTime: opts.lockRenewTime || 15000,
        maxStalledCount: opts.maxStalledCount || 2,
        maxStalledInterval: opts.maxStalledInterval || 5000,
        stalledInterval: opts.stalledInterval || 5000,
        maxRetriesPerStalledCount: opts.maxRetriesPerStalledCount || 2,
      }
    );

    this.setupWorkerListeners();
  }

  private setupWorkerListeners(): void {
    this.worker.on('completed', (job, result) => {
      this.logger.info(`Job completed: ${job.id}`, {
        jobType: job.data.type,
        tenantSlug: job.data.tenant_slug,
      });
    });

    this.worker.on('failed', (job, error) => {
      this.logger.error(`Job failed: ${job?.id}`, error, {
        jobType: job?.data.type,
        tenantSlug: job?.data.tenant_slug,
      });
    });

    this.worker.on('stalled', (jobId) => {
      this.logger.warn(`Job stalled: ${jobId}`, {
        queueName: this.queueName,
      });
    });
  }

  private async processJob(job: Job<OrchestratorJob>): Promise<void> {
    const jobId = job.id || job.data.job_id;
    const startTime = Date.now();

    // Start distributed trace
    DistributedTracer.startJobTrace(
      jobId,
      job.data.type,
      job.data.tenant_slug,
      this.queueName,
      {
        attempt: job.attemptsMade,
        stacktrace: job.stacktrace,
      }
    );

    const traceLogger = createJobTraceLogger(jobId, this.queueName);

    try {
      DistributedTracer.updateJobTrace(jobId, { status: 'running' });
      traceLogger.info('Starting job execution', {
        attempt: job.attemptsMade + 1,
      });

      // Execute the handler
      await this.handler(job);

      // Mark as successful
      const duration = Date.now() - startTime;
      DistributedTracer.completeJobTrace(jobId, 'success');
      await this.recordStats(job.data.type, duration, true);

      traceLogger.info('Job completed successfully', {
        duration,
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const err = error instanceof Error ? error : new Error(String(error));

      // Classify the error
      const classified = classifyError(err, {
        tenant_slug: job.data.tenant_slug,
        job_type: job.data.type,
        worker: this.queueName,
        attempt: job.attemptsMade + 1,
      });

      traceLogger.error('Job execution failed', err, {
        errorCategory: classified.category,
        strategy: classified.strategy,
        duration,
      });

      // Handle retry logic based on strategy
      const strategy = this.getRepairStrategy(classified);

      if (strategy.shouldRetry && job.attemptsMade < strategy.maxRetries) {
        // Update trace for retry
        DistributedTracer.completeJobTrace(jobId, 'failed', {
          message: err.message,
          category: classified.category,
          strategy: classified.strategy,
        });

        await this.recordStats(job.data.type, duration, false, true);

        // Retry with backoff
        const delayMs = this.calculateBackoffDelay(
          job.attemptsMade,
          strategy.backoffType
        );
        throw Object.assign(err, {
          attempts: job.attemptsMade + 1,
          delay: delayMs,
        });
      } else if (strategy.shouldRepair) {
        // Enqueue for repair
        DistributedTracer.updateJobTrace(jobId, {
          status: 'retry',
          metadata: {
            repairRequested: true,
            errorCategory: classified.category,
            strategy: classified.strategy,
          },
        });

        await this.enqueueRepair(job, classified, duration);
        await this.recordStats(job.data.type, duration, false, false);
      } else {
        // Fail immediately
        DistributedTracer.completeJobTrace(jobId, 'failed', {
          message: err.message,
          category: classified.category,
          strategy: classified.strategy,
        });

        await this.recordStats(job.data.type, duration, false);
        throw err;
      }
    }
  }

  private calculateBackoffDelay(
    attempt: number,
    backoffType: 'exponential' | 'linear'
  ): number {
    const baseDelay = 1000; // 1 second
    if (backoffType === 'exponential') {
      return Math.min(baseDelay * Math.pow(2, attempt), 300000); // Max 5 minutes
    }
    return baseDelay * (attempt + 1);
  }

  protected getRepairStrategy(
    classified: any
  ): {
    shouldRetry: boolean;
    shouldRepair: boolean;
    maxRetries: number;
    backoffType: 'exponential' | 'linear';
  } {
    switch (classified.strategy) {
      case 'auto_retry':
        return {
          shouldRetry: true,
          shouldRepair: false,
          maxRetries: 3,
          backoffType: 'exponential',
        };

      case 'exponential_backoff':
        return {
          shouldRetry: true,
          shouldRepair: false,
          maxRetries: 5,
          backoffType: 'exponential',
        };

      case 'operator_review':
        return {
          shouldRetry: false,
          shouldRepair: true,
          maxRetries: 0,
          backoffType: 'linear',
        };

      case 'fail_fast':
      default:
        return {
          shouldRetry: false,
          shouldRepair: false,
          maxRetries: 0,
          backoffType: 'linear',
        };
    }
  }

  protected async enqueueRepair(
    job: Job<OrchestratorJob>,
    classified: any,
    duration: number
  ): Promise<void> {
    if (!this.repairQueue) {
      this.logger.warn('Repair queue not initialized, skipping repair');
      return;
    }

    try {
      await this.repairQueue.add(
        'repair',
        {
          ...job.data,
          repairMetadata: {
            originalJobId: job.id,
            errorCategory: classified.category,
            strategy: classified.strategy,
            errorMessage: classified.errorMessage,
            timestamp: new Date(),
            attempts: job.attemptsMade + 1,
            duration,
          },
        },
        {
          attempts: this.maxRepairAttempts,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: {
            age: 3600,
          },
          removeOnFail: {
            age: 86400,
          },
        }
      );

      this.logger.info('Job enqueued for repair', {
        jobId: job.id,
        category: classified.category,
      });
    } catch (error) {
      this.logger.error(
        'Failed to enqueue repair job',
        error instanceof Error ? error : new Error(String(error)),
        { jobId: job.id }
      );
    }
  }

  private async recordStats(
    jobType: string,
    duration: number,
    success: boolean,
    retried: boolean = false
  ): Promise<void> {
    try {
      const collector = getStatsCollector();
      await collector.recordJobCompletion(
        this.queueName,
        duration,
        success,
        retried
      );
    } catch (error) {
      this.logger.error(
        'Failed to record stats',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  public getWorkerInstance(): Worker<OrchestratorJob> {
    return this.worker;
  }

  public async close(): Promise<void> {
    await this.worker.close();
  }
}
