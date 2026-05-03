import { randomUUID } from 'node:crypto';
import { watch } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';

interface WatcherOptions {
  cursorDir: string;
  orchestratorUrl: string;
  token: string;
  tenantSlug: string;
}

interface PromptMetadataEntry {
  prompt_path: string;
  job_id?: string;
  request_id: string;
  status: 'submitted' | 'failed';
  submitted_at: string;
  error?: string;
}

interface MetadataStore {
  prompts: Record<string, PromptMetadataEntry>;
}

function argValue(name: string): string | undefined {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function parseOptions(): WatcherOptions {
  const cursorDir = resolve(argValue('--cursor-dir') || '.cursor');
  return {
    cursorDir,
    orchestratorUrl: (argValue('--orchestrator-url') || 'http://localhost:3011').replace(/\/+$/, ''),
    token: argValue('--token') || process.env.PLATFORM_ADMIN_TOKEN || 'local-dev',
    tenantSlug: argValue('--tenant-slug') || process.env.OPSLY_LOCAL_TENANT_SLUG || 'opsly',
  };
}

async function readMetadata(path: string): Promise<MetadataStore> {
  try {
    const raw = await readFile(path, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      const p = parsed as Partial<MetadataStore>;
      if (typeof p.prompts === 'object' && p.prompts !== null) {
        return { prompts: p.prompts };
      }
    }
  } catch {
    // First run.
  }
  return { prompts: {} };
}

async function writeMetadata(path: string, store: MetadataStore): Promise<void> {
  await mkdir(resolve(path, '..'), { recursive: true });
  await writeFile(path, `${JSON.stringify(store, null, 2)}\n`, 'utf-8');
}

function parseFrontmatterValue(content: string, key: string): string | undefined {
  if (!content.startsWith('---\n')) {
    return undefined;
  }
  const end = content.indexOf('\n---', 4);
  if (end < 0) {
    return undefined;
  }
  const raw = content.slice(4, end).split('\n');
  for (const line of raw) {
    const idx = line.indexOf(':');
    if (idx <= 0) {
      continue;
    }
    if (line.slice(0, idx).trim() === key) {
      return line.slice(idx + 1).trim().replace(/^['"]|['"]$/g, '');
    }
  }
  return undefined;
}

async function submitPrompt(promptPath: string, options: WatcherOptions): Promise<PromptMetadataEntry> {
  const content = await readFile(promptPath, 'utf-8');
  const requestId = randomUUID();
  const agent = parseFrontmatterValue(content, 'agent') || parseFrontmatterValue(content, 'local_agent') || 'cursor';
  const agentRole = parseFrontmatterValue(content, 'agent_role') || 'executor';
  const maxStepsRaw = parseFrontmatterValue(content, 'max_steps');
  const maxSteps = maxStepsRaw ? Number.parseInt(maxStepsRaw, 10) : 5;
  const res = await fetch(`${options.orchestratorUrl}/api/local/prompt-submit`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      tenant_slug: options.tenantSlug,
      request_id: requestId,
      prompt_path: promptPath,
      local_agent: agent,
      agent_role: agentRole,
      max_steps: Number.isFinite(maxSteps) ? maxSteps : 5,
    }),
  });
  const parsed: unknown = await res.json().catch(() => ({}));
  const response = typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  if (!res.ok) {
    throw new Error(typeof response.error === 'string' ? response.error : `submit failed: ${res.status}`);
  }
  return {
    prompt_path: promptPath,
    request_id: typeof response.request_id === 'string' ? response.request_id : requestId,
    job_id: typeof response.job_id === 'string' ? response.job_id : undefined,
    status: 'submitted',
    submitted_at: new Date().toISOString(),
  };
}

async function handlePrompt(promptPath: string, options: WatcherOptions): Promise<void> {
  const metadataPath = join(options.cursorDir, 'prompts', '.metadata.json');
  const store = await readMetadata(metadataPath);
  if (store.prompts[promptPath]) {
    return;
  }
  try {
    store.prompts[promptPath] = await submitPrompt(promptPath, options);
    await writeMetadata(metadataPath, store);
    process.stdout.write(`[local-agent-watcher] submitted ${promptPath}\n`);
  } catch (err) {
    store.prompts[promptPath] = {
      prompt_path: promptPath,
      request_id: randomUUID(),
      status: 'failed',
      submitted_at: new Date().toISOString(),
      error: err instanceof Error ? err.message : String(err),
    };
    await writeMetadata(metadataPath, store);
    process.stderr.write(`[local-agent-watcher] failed ${promptPath}: ${store.prompts[promptPath].error}\n`);
  }
}

void (async () => {
  const options = parseOptions();
  const promptsDir = join(options.cursorDir, 'prompts');
  await mkdir(promptsDir, { recursive: true });
  process.stdout.write(`[local-agent-watcher] watching ${promptsDir}\n`);

  watch(promptsDir, (event, filename) => {
    if (event !== 'rename' || !filename || !filename.endsWith('.md')) {
      return;
    }
    const name = basename(filename);
    if (name === 'README.md' || name.startsWith('response-')) {
      return;
    }
    void handlePrompt(join(promptsDir, filename), options);
  });
})().catch((err) => {
  process.stderr.write(`[local-agent-watcher] ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
