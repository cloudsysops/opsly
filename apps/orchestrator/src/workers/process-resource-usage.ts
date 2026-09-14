import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export type ProcessResourceUsage = {
  pid: number;
  cpu_pct: number | null;
  rss_mb: number | null;
  elapsed: string | null;
};

export function parsePsResourceOutput(pid: number, raw: string): ProcessResourceUsage {
  const line = String(raw || '').trim();
  if (!line) return { pid, cpu_pct: null, rss_mb: null, elapsed: null };
  const parts = line.split(/\s+/);
  const cpu = Number(parts[0]);
  const rssKb = Number(parts[1]);
  const elapsed = parts.slice(2).join(' ') || null;
  return {
    pid,
    cpu_pct: Number.isFinite(cpu) ? cpu : null,
    rss_mb: Number.isFinite(rssKb) ? Number((rssKb / 1024).toFixed(1)) : null,
    elapsed,
  };
}

export async function readProcessResourceUsage(
  pid: number,
  execFn: typeof execFileAsync = execFileAsync,
): Promise<ProcessResourceUsage> {
  if (!Number.isInteger(pid) || pid <= 0) {
    return { pid, cpu_pct: null, rss_mb: null, elapsed: null };
  }
  try {
    const { stdout } = await execFn('ps', ['-p', String(pid), '-o', '%cpu=,rss=,etime='], {
      timeout: 1500,
    });
    return parsePsResourceOutput(pid, stdout);
  } catch {
    return { pid, cpu_pct: null, rss_mb: null, elapsed: null };
  }
}
