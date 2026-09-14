import { execa } from 'execa';

const DOCKER_STATS_TIMEOUT_MS = 1500;
const DOCKER_STATS_MAX_BUFFER_BYTES = 1024 * 1024;

export type DockerContainerResourceRow = {
  id: string;
  name: string;
  cpu_percent: number | null;
  memory_usage: string;
  memory_percent: number | null;
  net_io: string;
  block_io: string;
  pids: number | null;
};

function percent(value: unknown): number | null {
  const raw = String(value ?? '').trim().replace(/%$/, '');
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

function integer(value: unknown): number | null {
  const parsed = Number(String(value ?? '').trim());
  return Number.isInteger(parsed) ? parsed : null;
}

export function mapDockerStatsJsonLine(line: string): DockerContainerResourceRow | null {
  const trimmed = line.trim();
  if (!trimmed) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const row = parsed as Record<string, unknown>;
  const id = String(row.ID ?? row.Container ?? '').trim();
  const name = String(row.Name ?? '').trim();
  if (!id && !name) return null;
  return {
    id,
    name,
    cpu_percent: percent(row.CPUPerc),
    memory_usage: String(row.MemUsage ?? '').trim(),
    memory_percent: percent(row.MemPerc),
    net_io: String(row.NetIO ?? '').trim(),
    block_io: String(row.BlockIO ?? '').trim(),
    pids: integer(row.PIDs),
  };
}

export async function readDockerContainerResources(): Promise<{
  ok: boolean;
  containers: DockerContainerResourceRow[];
  error: string | null;
}> {
  try {
    const result = await execa(
      'docker',
      ['stats', '--no-stream', '--format', '{{json .}}'],
      {
        reject: false,
        timeout: DOCKER_STATS_TIMEOUT_MS,
        maxBuffer: DOCKER_STATS_MAX_BUFFER_BYTES,
      },
    );
    if (result.exitCode !== 0) {
      const error =
        typeof result.stderr === 'string' && result.stderr.trim().length > 0
          ? result.stderr.trim()
          : 'docker stats failed';
      return { ok: false, containers: [], error };
    }
    const containers = String(result.stdout ?? '')
      .split('\n')
      .map(mapDockerStatsJsonLine)
      .filter((row): row is DockerContainerResourceRow => row !== null);
    return { ok: true, containers, error: null };
  } catch (error) {
    return {
      ok: false,
      containers: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
