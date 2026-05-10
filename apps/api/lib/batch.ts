export const MAX_BATCH_SIZE = 100;
export const MIN_BATCH_SIZE = 1;
const BATCH_ID_RADIX = 36;
const BATCH_ID_SLICE_START = 2;
const BATCH_ID_SLICE_END = 8;

export function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }
  return chunks;
}

export function validateBatchSize(size: number): { valid: boolean; message?: string } {
  if (size < MIN_BATCH_SIZE) {
    return { valid: false, message: `Batch size must be at least ${MIN_BATCH_SIZE}` };
  }
  if (size > MAX_BATCH_SIZE) {
    return { valid: false, message: `Batch size cannot exceed ${MAX_BATCH_SIZE}` };
  }
  return { valid: true };
}

export function buildBatchId(prefix: string): string {
  const timestamp = Date.now();
  const random = Math.random()
    .toString(BATCH_ID_RADIX)
    .slice(BATCH_ID_SLICE_START, BATCH_ID_SLICE_END);
  return `${prefix}-${timestamp}-${random}`;
}

export function deduplicateJobs<T extends { id?: string; idempotency_key?: string }>(
  jobs: T[]
): { unique: T[]; duplicates: T[] } {
  const seen = new Set<string>();
  const unique: T[] = [];
  const duplicates: T[] = [];

  for (const job of jobs) {
    const key = job.idempotency_key || job.id || String(job);
    if (seen.has(key)) {
      duplicates.push(job);
    } else {
      seen.add(key);
      unique.push(job);
    }
  }

  return { unique, duplicates };
}

export interface BatchProcessOptions<T> {
  items: T[];
  chunkSize?: number;
  concurrency?: number;
  processor: (item: T, index: number) => Promise<unknown>;
  onProgress?: (processed: number, total: number) => void;
}

export async function processBatch<T>({
  items,
  chunkSize = MAX_BATCH_SIZE,
  concurrency = 5,
  processor,
  onProgress,
}: BatchProcessOptions<T>): Promise<{ results: unknown[]; errors: unknown[] }> {
  const chunks = chunkArray(items, chunkSize);
  const results: unknown[] = [];
  const errors: unknown[] = [];
  let processed = 0;

  for (const chunk of chunks) {
    const promises = chunk.map(async (item) => {
      const globalIndex = items.indexOf(item);
      try {
        const result = await processor(item, globalIndex);
        results.push(result);
      } catch (err) {
        errors.push({ item, error: err instanceof Error ? err.message : String(err) });
      }
      processed++;
      onProgress?.(processed, items.length);
    });

    await Promise.all(promises.slice(0, concurrency));
    await Promise.all(promises.slice(concurrency));
  }

  return { results, errors };
}
