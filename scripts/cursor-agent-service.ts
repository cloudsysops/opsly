import { randomUUID } from 'node:crypto';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { spawn } from 'node:child_process';

interface CursorExecuteRequest {
  job_id?: string;
  request_id?: string;
  prompt_path?: string;
  prompt_content?: string;
  agent_role?: string;
  max_steps?: number;
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolveRead, reject) => {
    let data = '';
    req.on('data', (chunk: Buffer) => {
      data += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolveRead(JSON.parse(data));
      } catch {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

function isCursorExecuteRequest(value: unknown): value is CursorExecuteRequest {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sendJson(res: ServerResponse, status: number, payload: Record<string, unknown>): void {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(payload));
}

async function openCursor(filePath: string): Promise<void> {
  const appName = process.env.OPSLY_CURSOR_APP_NAME || 'Cursor';
  await new Promise<void>((resolveOpen, reject) => {
    const child = spawn('open', ['-a', appName, filePath], { stdio: 'ignore' });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) {
        resolveOpen();
      } else {
        reject(new Error(`open -a ${appName} exited with ${code ?? 'unknown'}`));
      }
    });
  });
}

async function handleExecute(req: IncomingMessage, res: ServerResponse): Promise<void> {
  let body: unknown;
  try {
    body = await readJson(req);
  } catch {
    sendJson(res, 400, { success: false, error: 'Invalid JSON' });
    return;
  }

  if (!isCursorExecuteRequest(body)) {
    sendJson(res, 400, { success: false, error: 'invalid body' });
    return;
  }

  const prompt = typeof body.prompt_content === 'string' ? body.prompt_content.trim() : '';
  if (prompt.length === 0) {
    sendJson(res, 400, { success: false, error: 'prompt_content required' });
    return;
  }

  const jobId = typeof body.job_id === 'string' && body.job_id.length > 0 ? body.job_id : randomUUID();
  const promptDir = resolve(process.env.OPSLY_CURSOR_AGENT_PROMPT_DIR || '.cursor/.ipc');
  const responsesDir = resolve(process.env.OPSLY_LOCAL_RESPONSES_DIR || '.cursor/responses');
  await mkdir(promptDir, { recursive: true });
  await mkdir(responsesDir, { recursive: true });

  const promptPath = join(promptDir, `request-${jobId}.md`);
  const responsePath = join(responsesDir, `response-${jobId}-cursor.pending.md`);
  const content = [
    '---',
    `job_id: ${jobId}`,
    body.request_id ? `request_id: ${body.request_id}` : '',
    `agent_role: ${body.agent_role || 'executor'}`,
    `max_steps: ${body.max_steps ?? 5}`,
    '---',
    '',
    prompt,
    '',
  ].filter((line) => line.length > 0).join('\n');

  await writeFile(promptPath, content, 'utf-8');
  await openCursor(promptPath);
  await writeFile(
    responsePath,
    [
      `Cursor prompt opened for job ${jobId}.`,
      '',
      `Prompt file: ${promptPath}`,
      '',
      'Complete the task in Cursor, then replace this pending response with final notes if needed.',
      '',
    ].join('\n'),
    'utf-8'
  );

  sendJson(res, 202, {
    success: true,
    job_id: jobId,
    prompt_path: promptPath,
    response_path: responsePath,
  });
}

const port = Number.parseInt(process.env.CURSOR_AGENT_PORT || '5001', 10);
const server = createServer((req, res) => {
  const pathOnly = (req.url ?? '/').split('?')[0] ?? '/';
  if (req.method === 'GET' && pathOnly === '/health') {
    sendJson(res, 200, { status: 'ok', service: 'cursor-agent' });
    return;
  }
  if (req.method === 'POST' && pathOnly === '/execute') {
    void handleExecute(req, res).catch((err) => {
      sendJson(res, 500, { success: false, error: err instanceof Error ? err.message : String(err) });
    });
    return;
  }
  sendJson(res, 404, { error: 'not_found' });
});

server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`CursorAgent Service listening on http://127.0.0.1:${port}\n`);
});
