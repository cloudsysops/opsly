import { mkdir, appendFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { Job, Worker } from 'bullmq';

interface MemoryWriterPayload {
  tenant_slug?: string;
  request_id?: string;
  stream?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

function payloadFrom(job: Job): MemoryWriterPayload {
  const data = job.data as { payload?: MemoryWriterPayload };
  return data.payload ?? {};
}

function shouldHandle(job: Job): boolean {
  return job.name === 'maia.memory_write' || job.name === 'memory_write';
}

function memoryPath(): string {
  return resolve(process.env.MAIA_MEMORY_LOG_PATH ?? 'runtime/maia-memory.jsonl');
}

export function startMemoryWriterWorker(connection: object): Worker {
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (!shouldHandle(job)) {
        return;
      }

      const payload = payloadFrom(job);
      const path = memoryPath();
      const entry = {
        ts: new Date().toISOString(),
        job_id: String(job.id ?? 'unknown'),
        tenant_slug: payload.tenant_slug ?? 'platform',
        request_id: payload.request_id ?? 'unknown',
        stream: payload.stream ?? 'maia.life_systems',
        content: payload.content ?? '',
        metadata: payload.metadata ?? {},
      };

      await mkdir(dirname(path), { recursive: true });
      await appendFile(path, `${JSON.stringify(entry)}\n`, 'utf8');
      await job.updateProgress({ status: 'written', path });

      return { success: true, path, stream: entry.stream };
    },
    { connection, concurrency: 2 }
  );
}
