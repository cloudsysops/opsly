import Redis from 'ioredis';
import { createLogger } from '@intcloudsysops/observability';

const logger = createLogger('idempotency-service');

export interface IdempotencyRecord {
  idempotencyKey: string;
  tenantSlug: string;
  requestId: string;
  result?: unknown;
  error?: {
    message: string;
    code?: string;
  };
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  expiresAt: Date;
  metadata?: Record<string, any>;
}

export class IdempotencyService {
  private redis: Redis;
  private readonly prefix = 'idempotency:';
  private readonly ttlSeconds = 86400; // 24 hours by default

  constructor(redis: Redis, ttlSeconds?: number) {
    this.redis = redis;
    if (ttlSeconds) {
      this.ttlSeconds = ttlSeconds;
    }
  }

  /**
   * Check if an idempotency key has already been processed
   */
  async checkExists(
    idempotencyKey: string,
    tenantSlug: string
  ): Promise<IdempotencyRecord | null> {
    const key = this.getKey(tenantSlug, idempotencyKey);

    try {
      const data = await this.redis.get(key);
      if (data) {
        return JSON.parse(data);
      }
      return null;
    } catch (error) {
      logger.error('Error checking idempotency key', error as Error, {
        idempotencyKey,
        tenantSlug,
      });
      return null;
    }
  }

  /**
   * Record that a request is being processed (prevents duplicate concurrent processing)
   */
  async recordPending(
    idempotencyKey: string,
    tenantSlug: string,
    requestId: string,
    metadata?: Record<string, any>
  ): Promise<IdempotencyRecord> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlSeconds * 1000);

    const record: IdempotencyRecord = {
      idempotencyKey,
      tenantSlug,
      requestId,
      status: 'pending',
      createdAt: now,
      expiresAt,
      metadata,
    };

    const key = this.getKey(tenantSlug, idempotencyKey);

    try {
      // Use SET with NX (only if not exists) to prevent race conditions
      const result = await this.redis.set(
        key,
        JSON.stringify(record),
        'NX', // Only set if key does not exist
        'EX',
        this.ttlSeconds
      );

      if (!result) {
        // Key already exists - get it
        const existing = await this.checkExists(idempotencyKey, tenantSlug);
        if (existing) {
          logger.warn('Idempotency key already exists', {
            idempotencyKey,
            tenantSlug,
            existingRequestId: existing.requestId,
          });
          return existing;
        }
      }

      return record;
    } catch (error) {
      logger.error('Error recording pending idempotency', error as Error, {
        idempotencyKey,
        tenantSlug,
      });
      throw error;
    }
  }

  /**
   * Record successful completion of an idempotent operation
   */
  async recordCompletion(
    idempotencyKey: string,
    tenantSlug: string,
    requestId: string,
    result: unknown
  ): Promise<IdempotencyRecord> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlSeconds * 1000);

    const record: IdempotencyRecord = {
      idempotencyKey,
      tenantSlug,
      requestId,
      result,
      status: 'completed',
      createdAt: now,
      completedAt: now,
      expiresAt,
    };

    const key = this.getKey(tenantSlug, idempotencyKey);

    try {
      await this.redis.set(
        key,
        JSON.stringify(record),
        'EX',
        this.ttlSeconds
      );

      logger.info('Idempotency completion recorded', {
        idempotencyKey,
        tenantSlug,
        requestId,
      });

      return record;
    } catch (error) {
      logger.error('Error recording completion', error as Error, {
        idempotencyKey,
        tenantSlug,
      });
      throw error;
    }
  }

  /**
   * Record failed processing of an idempotent operation
   */
  async recordFailure(
    idempotencyKey: string,
    tenantSlug: string,
    requestId: string,
    error: Error,
    metadata?: Record<string, any>
  ): Promise<IdempotencyRecord> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.ttlSeconds * 1000);

    const record: IdempotencyRecord = {
      idempotencyKey,
      tenantSlug,
      requestId,
      error: {
        message: error.message,
        code: (error as any).code,
      },
      status: 'failed',
      createdAt: now,
      completedAt: now,
      expiresAt,
      metadata,
    };

    const key = this.getKey(tenantSlug, idempotencyKey);

    try {
      await this.redis.set(
        key,
        JSON.stringify(record),
        'EX',
        this.ttlSeconds
      );

      logger.info('Idempotency failure recorded', {
        idempotencyKey,
        tenantSlug,
        requestId,
        error: error.message,
      });

      return record;
    } catch (error) {
      logger.error('Error recording failure', error as Error, {
        idempotencyKey,
        tenantSlug,
      });
      throw error;
    }
  }

  /**
   * Get all idempotency records for a tenant (for debugging/audit)
   */
  async getAllForTenant(tenantSlug: string): Promise<IdempotencyRecord[]> {
    try {
      const pattern = `${this.prefix}${tenantSlug}:*`;
      const keys = await this.redis.keys(pattern);

      const records: IdempotencyRecord[] = [];
      for (const key of keys) {
        const data = await this.redis.get(key);
        if (data) {
          records.push(JSON.parse(data));
        }
      }

      return records;
    } catch (error) {
      logger.error('Error retrieving tenant records', error as Error, {
        tenantSlug,
      });
      return [];
    }
  }

  /**
   * Delete an idempotency record (useful for cleanup or testing)
   */
  async delete(idempotencyKey: string, tenantSlug: string): Promise<void> {
    const key = this.getKey(tenantSlug, idempotencyKey);

    try {
      await this.redis.del(key);
      logger.debug('Idempotency record deleted', {
        idempotencyKey,
        tenantSlug,
      });
    } catch (error) {
      logger.error('Error deleting idempotency record', error as Error, {
        idempotencyKey,
        tenantSlug,
      });
    }
  }

  /**
   * Clear all idempotency records for a tenant
   */
  async clearTenant(tenantSlug: string): Promise<void> {
    try {
      const pattern = `${this.prefix}${tenantSlug}:*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
        logger.info('Cleared tenant idempotency records', {
          tenantSlug,
          count: keys.length,
        });
      }
    } catch (error) {
      logger.error('Error clearing tenant records', error as Error, {
        tenantSlug,
      });
    }
  }

  /**
   * Execute a function idempotently
   */
  async executeIdempotent<T>(
    idempotencyKey: string,
    tenantSlug: string,
    requestId: string,
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<{ result: T; isDuplicate: boolean }> {
    // Check if already processed
    const existing = await this.checkExists(idempotencyKey, tenantSlug);

    if (existing && existing.status === 'completed') {
      logger.info('Idempotent operation already completed', {
        idempotencyKey,
        tenantSlug,
      });
      return {
        result: existing.result as T,
        isDuplicate: true,
      };
    }

    if (existing && existing.status === 'failed') {
      logger.info('Idempotent operation previously failed', {
        idempotencyKey,
        tenantSlug,
      });
      throw new Error(existing.error?.message || 'Previous operation failed');
    }

    // Record as pending
    await this.recordPending(idempotencyKey, tenantSlug, requestId, metadata);

    try {
      // Execute the function
      const result = await fn();

      // Record completion
      await this.recordCompletion(idempotencyKey, tenantSlug, requestId, result);

      return {
        result,
        isDuplicate: false,
      };
    } catch (error) {
      // Record failure
      await this.recordFailure(
        idempotencyKey,
        tenantSlug,
        requestId,
        error as Error,
        metadata
      );
      throw error;
    }
  }

  private getKey(tenantSlug: string, idempotencyKey: string): string {
    return `${this.prefix}${tenantSlug}:${idempotencyKey}`;
  }
}

let globalIdempotencyService: IdempotencyService | null = null;

export function initializeIdempotencyService(
  redis: Redis,
  ttlSeconds?: number
): IdempotencyService {
  globalIdempotencyService = new IdempotencyService(redis, ttlSeconds);
  return globalIdempotencyService;
}

export function getIdempotencyService(): IdempotencyService {
  if (!globalIdempotencyService) {
    throw new Error('Idempotency service not initialized');
  }
  return globalIdempotencyService;
}
