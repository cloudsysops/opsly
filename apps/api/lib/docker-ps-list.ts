import { execa } from 'execa';

import { DOCKER_PS_LIST_MAX, DOCKER_PS_LIST_MAX_BUFFER_BYTES } from './constants';

export type ListedDockerContainer = {
  id: string;
  names: string[];
  image: string;
  command: string;
  state: string;
  status: string;
  ports: string;
  created_at: string;
  running_for: string;
};

type DockerPsJson = Record<string, unknown>;

function readString(obj: DockerPsJson, keys: string[]): string {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === 'string' && v.length > 0) {
      return v;
    }
  }
  return '';
}

function readNames(obj: DockerPsJson): string[] {
  const raw = obj.Names ?? obj.names;
  if (Array.isArray(raw)) {
    return raw.map((x) => String(x)).filter((s) => s.length > 0);
  }
  if (typeof raw === 'string') {
    return raw
      .trim()
      .split(/\s+/)
      .map((s) => s.replace(/^\/+/, ''))
      .filter((s) => s.length > 0);
  }
  return [];
}

/** Expuesto para tests: una línea JSON de `docker ps --format '{{json .}}'`. */
export function mapDockerPsJsonLine(line: string): ListedDockerContainer | null {
  const trimmed = line.trim();
  if (trimmed.length === 0) {
    return null;
  }
  let obj: unknown;
  try {
    obj = JSON.parse(trimmed) as unknown;
  } catch {
    return null;
  }
  if (typeof obj !== 'object' || obj === null || Array.isArray(obj)) {
    return null;
  }
  const row = obj as DockerPsJson;
  const id = readString(row, ['ID', 'Id', 'id']);
  if (id.length === 0) {
    return null;
  }
  const names = readNames(row);
  return {
    id,
    names: names.length > 0 ? names : ['(sin nombre)'],
    image: readString(row, ['Image', 'image']),
    command: readString(row, ['Command', 'command']),
    state: readString(row, ['State', 'state']) || 'unknown',
    status: readString(row, ['Status', 'status']),
    ports: readString(row, ['Ports', 'ports']),
    created_at: readString(row, ['CreatedAt', 'Created', 'created_at']),
    running_for: readString(row, ['RunningFor', 'running_for']),
  };
}

export type DockerPsListResult =
  | {
      ok: true;
      containers: ListedDockerContainer[];
      truncated: boolean;
    }
  | { ok: false; error: string };

/**
 * Lista contenedores del host donde corre la API (`docker ps -a`), vía socket montado en el contenedor.
 */
export async function listDockerContainers(): Promise<DockerPsListResult> {
  try {
    const result = await execa('docker', ['ps', '-a', '--no-trunc', '--format', '{{json .}}'], {
      reject: false,
      maxBuffer: DOCKER_PS_LIST_MAX_BUFFER_BYTES,
    });
    if (result.exitCode !== 0) {
      const err =
        typeof result.stderr === 'string' && result.stderr.length > 0
          ? result.stderr.trim()
          : 'docker ps failed';
      return { ok: false, error: err };
    }
    if (typeof result.stdout !== 'string') {
      return { ok: false, error: 'docker ps returned no stdout' };
    }
    const lines = result.stdout.split('\n').filter((l) => l.trim().length > 0);
    const truncated = lines.length > DOCKER_PS_LIST_MAX;
    const slice = truncated ? lines.slice(0, DOCKER_PS_LIST_MAX) : lines;
    const containers: ListedDockerContainer[] = [];
    for (const line of slice) {
      const mapped = mapDockerPsJsonLine(line);
      if (mapped !== null) {
        containers.push(mapped);
      }
    }
    return { ok: true, containers, truncated };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'docker unavailable';
    return { ok: false, error: message };
  }
}
