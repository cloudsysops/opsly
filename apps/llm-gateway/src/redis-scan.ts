type RedisScanSource = {
  scanIterator(options: { MATCH: string; COUNT?: number }): AsyncIterable<string | string[]>;
};

const DEFAULT_SCAN_COUNT = 100;

/**
 * Count keys matching a pattern via SCAN (non-blocking).
 * Use instead of KEYS in production — shared Redis also serves BullMQ and OAuth.
 */
export async function countKeysByPattern(
  redis: RedisScanSource,
  pattern: string,
  scanCount = DEFAULT_SCAN_COUNT
): Promise<number> {
  let count = 0;
  for await (const key of redis.scanIterator({ MATCH: pattern, COUNT: scanCount })) {
    if (Array.isArray(key)) {
      count += key.length;
      continue;
    }
    count += 1;
  }
  return count;
}
