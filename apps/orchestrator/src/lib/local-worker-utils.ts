import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';

export type LocalAgentKind = 'cursor' | 'claude' | 'copilot' | 'opencode';

export interface ParsedPromptFile {
  content: string;
  metadata: Record<string, string>;
}

export interface LocalAgentExecuteRequest {
  job_id: string;
  request_id?: string;
  tenant_slug: string;
  prompt_path?: string;
  prompt_content: string;
  agent: LocalAgentKind;
  agent_role: string;
  max_steps: number;
  metadata: Record<string, unknown>;
}

export interface LocalAgentExecuteResponse {
  success?: boolean;
  response_content?: string;
  response_path?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

export function parsePromptFrontmatter(content: string): ParsedPromptFile {
  if (!content.startsWith('---\n')) {
    return { content, metadata: {} };
  }

  const end = content.indexOf('\n---', 4);
  if (end < 0) {
    return { content, metadata: {} };
  }

  const raw = content.slice(4, end).trim();
  const metadata: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const idx = line.indexOf(':');
    if (idx <= 0) {
      continue;
    }
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key.length > 0) {
      metadata[key] = value;
    }
  }

  const bodyStart = content.indexOf('\n', end + 4);
  return {
    content: bodyStart >= 0 ? content.slice(bodyStart + 1).trimStart() : '',
    metadata,
  };
}

export async function readPromptInput(input: {
  promptPath?: string;
  promptContent?: string;
}): Promise<ParsedPromptFile & { promptPath?: string }> {
  if (typeof input.promptContent === 'string' && input.promptContent.trim().length > 0) {
    return parsePromptFrontmatter(input.promptContent);
  }

  if (typeof input.promptPath !== 'string' || input.promptPath.trim().length === 0) {
    throw new Error('local worker requires prompt_path or prompt_content');
  }

  const promptPath = resolve(input.promptPath);
  const content = await readFile(promptPath, 'utf-8');
  return { ...parsePromptFrontmatter(content), promptPath };
}

export function normalizeLocalAgentKind(value: unknown): LocalAgentKind {
  if (value === 'claude' || value === 'copilot' || value === 'opencode' || value === 'cursor') {
    return value;
  }
  return 'cursor';
}

export function jobTypeForLocalAgent(agent: LocalAgentKind):
  | 'local_cursor'
  | 'local_claude'
  | 'local_copilot'
  | 'local_opencode' {
  switch (agent) {
    case 'claude':
      return 'local_claude';
    case 'copilot':
      return 'local_copilot';
    case 'opencode':
      return 'local_opencode';
    case 'cursor':
      return 'local_cursor';
  }
}

export function localAgentForJobType(jobType: string): LocalAgentKind | null {
  switch (jobType) {
    case 'local_cursor':
      return 'cursor';
    case 'local_claude':
      return 'claude';
    case 'local_copilot':
      return 'copilot';
    case 'local_opencode':
      return 'opencode';
    default:
      return null;
  }
}

export function resolveLocalResponsesDir(): string {
  return resolve(process.env.OPSLY_LOCAL_RESPONSES_DIR || '.cursor/responses');
}

export async function writeLocalWorkerResponse(input: {
  jobId: string;
  agent: LocalAgentKind;
  content: string;
  responsesDir?: string;
}): Promise<string> {
  const responsesDir = resolve(input.responsesDir || resolveLocalResponsesDir());
  await mkdir(responsesDir, { recursive: true });
  const responsePath = join(responsesDir, `response-${input.jobId}-${input.agent}.md`);
  await writeFile(responsePath, input.content, 'utf-8');
  return responsePath;
}

export async function waitForFile(filePath: string, timeoutMs: number): Promise<string> {
  const startedAt = Date.now();
  const resolved = resolve(filePath);
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const s = await stat(resolved);
      if (s.isFile() && s.size > 0) {
        return await readFile(resolved, 'utf-8');
      }
    } catch {
      // Keep polling until timeout.
    }
    await new Promise((resolvePoll) => setTimeout(resolvePoll, 500));
  }
  throw new Error(`Timed out waiting for ${resolved}`);
}

export function formatLocalWorkerResponse(input: {
  agent: LocalAgentKind;
  jobId: string;
  requestId?: string;
  sourcePath?: string;
  body: string;
}): string {
  const lines = [
    '---',
    `agent: ${input.agent}`,
    `job_id: ${input.jobId}`,
    input.requestId ? `request_id: ${input.requestId}` : '',
    input.sourcePath ? `source_path: ${input.sourcePath}` : '',
    `created_at: ${new Date().toISOString()}`,
    '---',
    '',
    input.body.trim(),
    '',
  ];
  return lines.filter((line) => line.length > 0).join('\n');
}

export function safeResponseTitle(responsePath: string): string {
  return basename(responsePath).replace(/[^a-zA-Z0-9._-]/g, '-');
}

export function resolveCursorIpcDir(): string {
  return resolve(process.env.OPSLY_CURSOR_IPC_DIR || '.cursor/.ipc');
}

export async function ensureLocalAgentDirs(): Promise<void> {
  await mkdir(resolveLocalResponsesDir(), { recursive: true });
  await mkdir(resolveCursorIpcDir(), { recursive: true });
  await mkdir(dirname(resolve('.cursor/prompts/.metadata.json')), { recursive: true });
}
