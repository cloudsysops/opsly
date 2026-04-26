import { afterEach, describe, expect, it } from 'vitest';
import { classifyTaskCategory } from '../src/task-category-classifier.js';

describe('classifyTaskCategory tenant guard', () => {
  afterEach(() => {
    delete process.env.OPSLY_CLASSIFIER_ALLOWED_TENANTS;
  });

  it('rejects tenant not in OPSLY_CLASSIFIER_ALLOWED_TENANTS', async () => {
    process.env.OPSLY_CLASSIFIER_ALLOWED_TENANTS = 'intcloudsysops';
    await expect(
      classifyTaskCategory({
        taskDescription: 'test',
        tenantSlug: 'smiletripcare',
      })
    ).rejects.toThrow(/not allowed/);
  });
});
