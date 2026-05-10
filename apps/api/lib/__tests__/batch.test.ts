import { describe, it, expect } from 'vitest';
import { chunkArray, validateBatchSize, buildBatchId, deduplicateJobs } from '../batch';

describe('batch utilities', () => {
  describe('chunkArray', () => {
    it('chunks array into smaller arrays', () => {
      const input = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const result = chunkArray(input, 3);
      expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9], [10]]);
    });

    it('handles empty array', () => {
      expect(chunkArray([], 3)).toEqual([]);
    });

    it('handles chunk size larger than array', () => {
      expect(chunkArray([1, 2], 5)).toEqual([[1, 2]]);
    });
  });

  describe('validateBatchSize', () => {
    it('accepts valid size', () => {
      expect(validateBatchSize(50)).toEqual({ valid: true });
    });

    it('rejects size below minimum', () => {
      const result = validateBatchSize(0);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('at least');
    });

    it('rejects size above maximum', () => {
      const result = validateBatchSize(101);
      expect(result.valid).toBe(false);
      expect(result.message).toContain('exceed');
    });

    it('accepts boundary values', () => {
      expect(validateBatchSize(1).valid).toBe(true);
      expect(validateBatchSize(100).valid).toBe(true);
    });
  });

  describe('buildBatchId', () => {
    it('generates unique batch IDs', () => {
      const id1 = buildBatchId('test');
      const id2 = buildBatchId('test');
      expect(id1).toMatch(/^test-\d+-[a-z0-9]+$/);
      expect(id2).toMatch(/^test-\d+-[a-z0-9]+$/);
      expect(id1).not.toBe(id2);
    });

    it('uses provided prefix', () => {
      const id = buildBatchId('my-batch');
      expect(id.startsWith('my-batch-')).toBe(true);
    });
  });

  describe('deduplicateJobs', () => {
    it('removes duplicates by idempotency_key', () => {
      const jobs = [
        { id: '1', idempotency_key: 'key-a' },
        { id: '2', idempotency_key: 'key-b' },
        { id: '3', idempotency_key: 'key-a' },
      ];
      const { unique, duplicates } = deduplicateJobs(jobs);
      expect(unique).toHaveLength(2);
      expect(duplicates).toHaveLength(1);
      expect(duplicates[0].id).toBe('3');
    });

    it('removes duplicates by id', () => {
      const jobs = [{ id: '1' }, { id: '2' }, { id: '1' }];
      const { unique, duplicates } = deduplicateJobs(jobs);
      expect(unique).toHaveLength(2);
      expect(duplicates).toHaveLength(1);
    });

    it('handles empty array', () => {
      const { unique, duplicates } = deduplicateJobs([]);
      expect(unique).toHaveLength(0);
      expect(duplicates).toHaveLength(0);
    });

    it('keeps all items when no duplicates', () => {
      const jobs = [{ id: '1' }, { id: '2' }, { id: '3' }];
      const { unique, duplicates } = deduplicateJobs(jobs);
      expect(unique).toHaveLength(3);
      expect(duplicates).toHaveLength(0);
    });
  });
});
