import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Redis from 'ioredis';
import { IdempotencyService } from '../idempotency-service';

describe('IdempotencyService', () => {
  let redis: Redis;
  let service: IdempotencyService;
  const testTenantSlug = 'test-tenant';
  const testIdempotencyKey = 'test-idempotency-key';
  const testRequestId = 'test-request-id';

  beforeEach(async () => {
    redis = new Redis({
      host: 'localhost',
      port: 6379,
      db: 15, // Use separate test DB
    });

    service = new IdempotencyService(redis, 3600);

    // Clear test data
    await redis.flushdb();
  });

  afterEach(async () => {
    await redis.flushdb();
    await redis.quit();
  });

  describe('recordPending', () => {
    it('should record a pending operation', async () => {
      const record = await service.recordPending(
        testIdempotencyKey,
        testTenantSlug,
        testRequestId
      );

      expect(record.status).toBe('pending');
      expect(record.idempotencyKey).toBe(testIdempotencyKey);
      expect(record.tenantSlug).toBe(testTenantSlug);
    });

    it('should prevent duplicate pending records', async () => {
      const record1 = await service.recordPending(
        testIdempotencyKey,
        testTenantSlug,
        testRequestId
      );

      const record2 = await service.recordPending(
        testIdempotencyKey,
        testTenantSlug,
        'different-request-id'
      );

      expect(record1.requestId).toBe(testRequestId);
      expect(record2.requestId).toBe(testRequestId); // Should return original
    });
  });

  describe('recordCompletion', () => {
    it('should record successful completion', async () => {
      const testResult = { success: true, id: 123 };
      const record = await service.recordCompletion(
        testIdempotencyKey,
        testTenantSlug,
        testRequestId,
        testResult
      );

      expect(record.status).toBe('completed');
      expect(record.result).toEqual(testResult);
      expect(record.completedAt).toBeDefined();
    });

    it('should overwrite pending record with completion', async () => {
      await service.recordPending(
        testIdempotencyKey,
        testTenantSlug,
        testRequestId
      );

      const testResult = { success: true };
      await service.recordCompletion(
        testIdempotencyKey,
        testTenantSlug,
        testRequestId,
        testResult
      );

      const record = await service.checkExists(
        testIdempotencyKey,
        testTenantSlug
      );
      expect(record?.status).toBe('completed');
      expect(record?.result).toEqual(testResult);
    });
  });

  describe('recordFailure', () => {
    it('should record failed operation', async () => {
      const error = new Error('Test error');
      const record = await service.recordFailure(
        testIdempotencyKey,
        testTenantSlug,
        testRequestId,
        error
      );

      expect(record.status).toBe('failed');
      expect(record.error?.message).toBe('Test error');
      expect(record.completedAt).toBeDefined();
    });

    it('should preserve error code', async () => {
      const error = new Error('Not found') as any;
      error.code = 'NOT_FOUND';

      const record = await service.recordFailure(
        testIdempotencyKey,
        testTenantSlug,
        testRequestId,
        error
      );

      expect(record.error?.code).toBe('NOT_FOUND');
    });
  });

  describe('checkExists', () => {
    it('should find existing record', async () => {
      await service.recordCompletion(
        testIdempotencyKey,
        testTenantSlug,
        testRequestId,
        { result: 'ok' }
      );

      const record = await service.checkExists(
        testIdempotencyKey,
        testTenantSlug
      );
      expect(record).not.toBeNull();
      expect(record?.status).toBe('completed');
    });

    it('should return null for non-existent record', async () => {
      const record = await service.checkExists(
        'non-existent-key',
        testTenantSlug
      );
      expect(record).toBeNull();
    });

    it('should not find record from different tenant', async () => {
      await service.recordCompletion(
        testIdempotencyKey,
        testTenantSlug,
        testRequestId,
        { result: 'ok' }
      );

      const record = await service.checkExists(
        testIdempotencyKey,
        'different-tenant'
      );
      expect(record).toBeNull();
    });
  });

  describe('executeIdempotent', () => {
    it('should execute function and record completion', async () => {
      const mockFn = async () => ({ id: 123, name: 'test' });

      const { result, isDuplicate } = await service.executeIdempotent(
        testIdempotencyKey,
        testTenantSlug,
        testRequestId,
        mockFn
      );

      expect(isDuplicate).toBe(false);
      expect(result).toEqual({ id: 123, name: 'test' });

      const record = await service.checkExists(
        testIdempotencyKey,
        testTenantSlug
      );
      expect(record?.status).toBe('completed');
    });

    it('should return cached result on duplicate call', async () => {
      const mockFn = async () => ({ id: 123 });
      let callCount = 0;

      const wrappedFn = async () => {
        callCount++;
        return mockFn();
      };

      // First call
      const result1 = await service.executeIdempotent(
        testIdempotencyKey,
        testTenantSlug,
        testRequestId,
        wrappedFn
      );

      // Second call with same key
      const result2 = await service.executeIdempotent(
        testIdempotencyKey,
        testTenantSlug,
        'different-request-id',
        wrappedFn
      );

      expect(callCount).toBe(1); // Function should only be called once
      expect(result1.result).toEqual(result2.result);
      expect(result2.isDuplicate).toBe(true);
    });

    it('should propagate errors and record failure', async () => {
      const testError = new Error('Operation failed');
      const mockFn = async () => {
        throw testError;
      };

      await expect(
        service.executeIdempotent(
          testIdempotencyKey,
          testTenantSlug,
          testRequestId,
          mockFn
        )
      ).rejects.toThrow('Operation failed');

      const record = await service.checkExists(
        testIdempotencyKey,
        testTenantSlug
      );
      expect(record?.status).toBe('failed');
    });

    it('should throw error on retry after failure', async () => {
      const testError = new Error('Initial failure');
      const mockFn = async () => {
        throw testError;
      };

      // First call fails
      await expect(
        service.executeIdempotent(
          testIdempotencyKey,
          testTenantSlug,
          testRequestId,
          mockFn
        )
      ).rejects.toThrow();

      // Retry should throw same error
      const retryFn = async () => ({ success: true });
      await expect(
        service.executeIdempotent(
          testIdempotencyKey,
          testTenantSlug,
          'different-request-id',
          retryFn
        )
      ).rejects.toThrow('Previous operation failed');
    });
  });

  describe('getAllForTenant', () => {
    it('should retrieve all records for tenant', async () => {
      await service.recordCompletion(
        'key-1',
        testTenantSlug,
        testRequestId,
        { id: 1 }
      );
      await service.recordCompletion(
        'key-2',
        testTenantSlug,
        testRequestId,
        { id: 2 }
      );
      await service.recordCompletion(
        'key-3',
        'different-tenant',
        testRequestId,
        { id: 3 }
      );

      const records = await service.getAllForTenant(testTenantSlug);
      expect(records.length).toBe(2);
      expect(records.map((r) => r.idempotencyKey)).toEqual(
        expect.arrayContaining(['key-1', 'key-2'])
      );
    });

    it('should return empty array for tenant with no records', async () => {
      const records = await service.getAllForTenant('non-existent-tenant');
      expect(records).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete idempotency record', async () => {
      await service.recordCompletion(
        testIdempotencyKey,
        testTenantSlug,
        testRequestId,
        { id: 1 }
      );

      await service.delete(testIdempotencyKey, testTenantSlug);

      const record = await service.checkExists(
        testIdempotencyKey,
        testTenantSlug
      );
      expect(record).toBeNull();
    });
  });

  describe('clearTenant', () => {
    it('should clear all records for tenant', async () => {
      await service.recordCompletion(
        'key-1',
        testTenantSlug,
        testRequestId,
        { id: 1 }
      );
      await service.recordCompletion(
        'key-2',
        testTenantSlug,
        testRequestId,
        { id: 2 }
      );

      await service.clearTenant(testTenantSlug);

      const records = await service.getAllForTenant(testTenantSlug);
      expect(records).toEqual([]);
    });

    it('should not affect other tenants', async () => {
      await service.recordCompletion(
        'key-1',
        testTenantSlug,
        testRequestId,
        { id: 1 }
      );
      await service.recordCompletion(
        'key-2',
        'other-tenant',
        testRequestId,
        { id: 2 }
      );

      await service.clearTenant(testTenantSlug);

      const records = await service.getAllForTenant('other-tenant');
      expect(records.length).toBe(1);
    });
  });

  describe('TTL handling', () => {
    it('should set TTL on records', async () => {
      const shortTtlService = new IdempotencyService(redis, 1);

      await shortTtlService.recordCompletion(
        testIdempotencyKey,
        testTenantSlug,
        testRequestId,
        { id: 1 }
      );

      // Wait for TTL to expire
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const record = await shortTtlService.checkExists(
        testIdempotencyKey,
        testTenantSlug
      );
      expect(record).toBeNull();
    });
  });
});
