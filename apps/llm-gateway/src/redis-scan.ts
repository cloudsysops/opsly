const DEFAULT_SCAN_COUNT = 100;

/**
 * Count keys matching a pattern via SCAN (non-blocking).
 * In redis@5, scanIterator yields arrays of keys, not individual keys.
 * Use instead of KEYS in production — shared Redis also serves BullMQ and OAuth.
 */
export async function countKeysByPattern(
  redis: { scanIterator(options: { MATCH: string; COUNT?: number }): AsyncIterable<string[]> },
  pattern: string,
  scanCount = DEFAULT_SCAN_COUNT
): Promise<number> {
  let count = 0;
  for await (const keys of redis.scanIterator({ MATCH: pattern, COUNT: scanCount })) {
    count += keys.length;
  }
  return count;
}
