import { Job, Worker } from 'bullmq';

interface ClaudeCodePayload {
  task?: string;
  repository?: string;
  branch?: string;
  files?: string[];
  tenant_slug?: string;
  request_id?: string;
}

function payloadFrom(job: Job): ClaudeCodePayload {
  const data = job.data as { payload?: ClaudeCodePayload };
  return data.payload ?? {};
}

function shouldHandle(job: Job): boolean {
  return job.name === 'maia.claude_code' || job.name === 'claude_code';
}

function buildPrompt(payload: ClaudeCodePayload): string {
  const files = payload.files?.length ? payload.files.map((file) => `- ${file}`).join('\n') : '- none';
  return [
    '# Maia Claude Code task',
    '',
    `Repository: ${payload.repository ?? 'cloudsysops/opsly'}`,
    `Branch: ${payload.branch ?? 'staging'}`,
    `Tenant: ${payload.tenant_slug ?? 'platform'}`,
    `Request: ${payload.request_id ?? 'unknown'}`,
    '',
    '## Task',
    payload.task ?? 'Review and implement the assigned Maia life-system task.',
    '',
    '## Files',
    files,
  ].join('\n');
}

export function startClaudeCodeWorker(connection: object): Worker {
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (!shouldHandle(job)) {
        return;
      }

      const payload = payloadFrom(job);
      const prompt = buildPrompt(payload);
      const webhookUrl = process.env.CLAUDE_CODE_WEBHOOK_URL?.trim();

      await job.updateProgress({ status: webhookUrl ? 'dispatching' : 'prepared' });

      if (!webhookUrl) {
        return { success: true, dispatched: false, prompt };
      }

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, payload }),
      });

      if (!response.ok) {
        throw new Error(`Claude Code webhook failed with status ${response.status}`);
      }

      return { success: true, dispatched: true };
    },
    { connection, concurrency: 1 }
  );
}
