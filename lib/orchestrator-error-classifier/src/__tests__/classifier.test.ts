import { describe, it, expect, beforeEach } from 'vitest';
import { ErrorClassifier, classifyError } from '../classifier';
import type { ErrorContext } from '../types';

describe('ErrorClassifier', () => {
  let classifier: ErrorClassifier;

  beforeEach(() => {
    classifier = new ErrorClassifier();
  });

  describe('classify', () => {
    it('should classify credits exhausted error', () => {
      const error = new Error('Insufficient credits for this operation');
      const context: Partial<ErrorContext> = { tenant_slug: 'test-tenant' };

      const result = classifier.classify(error, context);

      expect(result.category).toBe('credits_exhausted');
      expect(result.strategy).toBe('operator_review');
      expect(result.isRecoverable).toBe(true);
      expect(result.priority).toBe('critical');
    });

    it('should classify rate limit error', () => {
      const error = new Error('Too many requests: 429');
      const context: Partial<ErrorContext> = { tenant_slug: 'test-tenant' };

      const result = classifier.classify(error, context);

      expect(result.category).toBe('rate_limit');
      expect(result.strategy).toBe('exponential_backoff');
      expect(result.isRecoverable).toBe(true);
    });

    it('should classify timeout error', () => {
      const error = new Error('Operation timed out after 30s');
      const context: Partial<ErrorContext> = { tenant_slug: 'test-tenant' };

      const result = classifier.classify(error, context);

      expect(result.category).toBe('timeout');
      expect(result.isRecoverable).toBe(true);
    });

    it('should classify config error', () => {
      const error = new Error('Authentication failed: invalid token');
      const context: Partial<ErrorContext> = { tenant_slug: 'test-tenant' };

      const result = classifier.classify(error, context);

      expect(result.category).toBe('config_error');
      expect(result.strategy).toBe('operator_review');
      expect(result.priority).toBe('critical');
    });

    it('should classify irrecuperable error', () => {
      const error = new Error('Cannot read property "foo" of undefined');
      const context: Partial<ErrorContext> = { tenant_slug: 'test-tenant' };

      const result = classifier.classify(error, context);

      expect(result.category).toBe('irrecuperable');
      expect(result.strategy).toBe('fail_fast');
      expect(result.isRecoverable).toBe(false);
    });

    it('should classify unknown error', () => {
      const error = new Error('Some random error');
      const context: Partial<ErrorContext> = { tenant_slug: 'test-tenant' };

      const result = classifier.classify(error, context);

      expect(result.category).toBe('unknown');
      expect(result.confidence).toBeLessThan(0.5);
    });

    it('should handle string errors', () => {
      const error = 'Insufficient credits';
      const context: Partial<ErrorContext> = { tenant_slug: 'test-tenant' };

      const result = classifier.classify(error, context);

      expect(result.category).toBe('credits_exhausted');
      expect(result.message).toBe(error);
    });

    it('should include context in metadata', () => {
      const error = new Error('Test error');
      const context: Partial<ErrorContext> = {
        tenant_slug: 'test-tenant',
        job_type: 'cursor',
        worker: 'cursor-worker',
      };

      const result = classifier.classify(error, context);

      expect(result.metadata.context).toEqual(
        expect.objectContaining({
          tenant_slug: 'test-tenant',
          job_type: 'cursor',
          worker: 'cursor-worker',
        })
      );
    });

    it('should be case insensitive', () => {
      const error1 = new Error('INSUFFICIENT CREDITS');
      const error2 = new Error('insufficient credits');

      const result1 = classifier.classify(error1);
      const result2 = classifier.classify(error2);

      expect(result1.category).toBe(result2.category);
      expect(result1.category).toBe('credits_exhausted');
    });
  });

  describe('getRepairStrategy', () => {
    it('should return repair strategy for recoverable error', () => {
      const error = new Error('Rate limit exceeded: 429');
      const classified = classifier.classify(error);

      const strategy = classifier.getRepairStrategy(classified);

      expect(strategy.shouldRepair).toBe(true);
      expect(strategy.strategy).toBe('exponential_backoff');
      expect(strategy.maxAttempts).toBeGreaterThan(0);
    });

    it('should not repair for irrecuperable errors', () => {
      const error = new Error('Cannot read property');
      const classified = classifier.classify(error);

      const strategy = classifier.getRepairStrategy(classified);

      expect(strategy.shouldRepair).toBe(false);
      expect(strategy.strategy).toBe('fail_fast');
    });

    it('should include backoff timing', () => {
      const error = new Error('Rate limit exceeded');
      const classified = classifier.classify(error);

      const strategy = classifier.getRepairStrategy(classified);

      expect(strategy.backoffMs).toBeGreaterThan(0);
    });
  });

  describe('addRule', () => {
    it('should add custom rule', () => {
      const customRule = {
        id: 'custom-test',
        name: 'Custom Error',
        pattern: /custom.*error/i,
        category: 'provider_error' as const,
        strategy: 'auto_retry' as const,
        priority: 'normal' as const,
        isRecoverable: true,
        suggestedAction: 'Test action',
        tags: ['test'],
      };

      classifier.addRule(customRule);

      const result = classifier.classify(new Error('Custom error occurred'));

      expect(result.category).toBe('provider_error');
      expect(result.metadata.ruleId).toBe('custom-test');
    });
  });

  describe('removeRule', () => {
    it('should remove rule by id', () => {
      const removed = classifier.removeRule('credits-exhausted-anthropic');

      expect(removed).toBe(true);

      const result = classifier.classify(new Error('Insufficient credits'));

      // Should fall back to unknown since the rule is removed
      expect(result.category).toBe('unknown');
    });

    it('should return false if rule not found', () => {
      const removed = classifier.removeRule('non-existent-id');

      expect(removed).toBe(false);
    });
  });

  describe('getStats', () => {
    it('should return classifier statistics', () => {
      const stats = classifier.getStats();

      expect(stats.totalRules).toBeGreaterThan(0);
      expect(Object.keys(stats.byCategory).length).toBeGreaterThan(0);
      expect(Object.keys(stats.byStrategy).length).toBeGreaterThan(0);
    });

    it('should count rules by category', () => {
      const stats = classifier.getStats();

      expect(stats.byCategory.rate_limit).toBeGreaterThan(0);
      expect(stats.byCategory.config_error).toBeGreaterThan(0);
    });
  });

  describe('global functions', () => {
    it('should classify using global function', () => {
      const error = new Error('Insufficient credits');
      const context: Partial<ErrorContext> = { tenant_slug: 'test' };

      const result = classifyError(error, context);

      expect(result.category).toBe('credits_exhausted');
    });
  });

  describe('error patterns', () => {
    const testCases = [
      {
        error: 'Insufficient credits for tenant',
        expectedCategory: 'credits_exhausted' as const,
      },
      {
        error: 'Rate limit exceeded',
        expectedCategory: 'rate_limit' as const,
      },
      {
        error: 'Operation timed out',
        expectedCategory: 'timeout' as const,
      },
      {
        error: 'Invalid API key provided',
        expectedCategory: 'config_error' as const,
      },
      {
        error: 'Service unavailable 503',
        expectedCategory: 'provider_error' as const,
      },
      {
        error: 'Type error: cannot read',
        expectedCategory: 'irrecuperable' as const,
      },
    ];

    testCases.forEach(({ error, expectedCategory }) => {
      it(`should classify "${error}"`, () => {
        const result = classifier.classify(error);
        expect(result.category).toBe(expectedCategory);
      });
    });
  });
});
