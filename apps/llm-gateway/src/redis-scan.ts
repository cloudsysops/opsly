type RedisScanSource = {
  scanIterator(options: { MATCH: string; COUNT?: number }): AsyncIterable<string>;
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
  for await (const _key of redis.scanIterator({ MATCH: pattern, COUNT: scanCount })) {
    count += 1;
  }
  return count;
}
