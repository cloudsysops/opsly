import { describe, expect, it } from 'vitest';
import { countKeysByPattern } from '../src/redis-scan.js';

function mockRedisWithKeys(keys: string[]) {
  return {
    scanIterator: async function* ({ MATCH }: { MATCH?: string; COUNT?: number }) {
      const prefix = MATCH?.replace(/\*$/, '') ?? '';
      for (const key of keys) {
        if (key.startsWith(prefix)) {
          yield key;
        }
      }
    },
  };
}

describe('countKeysByPattern', () => {
  it('counts tenant-scoped LLM cache keys without KEYS', async () => {
    const redis = mockRedisWithKeys([
      'tenant:acme:llm:cache:abc',
      'tenant:acme:llm:cache:def',
      'tenant:beta:llm:cache:xyz',
      'bull:openclaw:meta',
    ]);

    const count = await countKeysByPattern(redis, 'tenant:acme:llm:cache:*');
    expect(count).toBe(2);
  });

  it('returns zero when no keys match', async () => {
    const redis = mockRedisWithKeys(['tenant:other:llm:cache:only']);
    const count = await countKeysByPattern(redis, 'tenant:acme:llm:cache:*');
    expect(count).toBe(0);
  });
});
