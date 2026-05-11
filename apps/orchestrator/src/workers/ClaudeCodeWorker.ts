import { Job, Worker } from 'bullmq';
import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';

interface ClaudeCodePayload {
  tenant_slug?: string;
  request_id?: string;
  prompt: string;
  mode?: 'plan' | 'implement' | 'review';
  target_path?: string;
}

function requirePrompt(payload: Partial<ClaudeCodePayload>): string {
  const prompt = payload.prompt?.trim();
  if (!prompt) throw new Error('maia_claude_code requires payload.prompt');
  return prompt;
}

export function startClaudeCodeWorker(connection: object) {
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (job.name !== 'maia_claude_code') return;
      const payload = (job.data?.payload ?? job.data ?? {}) as ClaudeCodePayload;
      const prompt = requirePrompt(payload);
      const targetPath = payload.target_path?.trim() || 'runtime/maia/claude-code-queue.jsonl';
      const path = join(process.cwd(), targetPath);
      await mkdir(dirname(path), { recursive: true });
      await appendFile(
        path,
        `${JSON.stringify({
          ts: new Date().toISOString(),
          tenant_slug: payload.tenant_slug ?? 'platform',
          request_id: payload.request_id ?? null,
          mode: payload.mode ?? 'plan',
          prompt,
        })}\n`,
        'utf8'
      );
      return { success: true, queued: true, target_path: targetPath };
    },
    { connection, concurrency: 1 }
  );
}
