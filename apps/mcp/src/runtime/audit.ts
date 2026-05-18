import { appendFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

export interface RuntimeAuditEntry {
  ts: string;
  tool_id: string;
  tenant_slug?: string;
  session_id?: string;
  allowed: boolean;
  status: 'ok' | 'denied' | 'error';
  message?: string;
}

function auditLogPath(): string {
  const root = process.env.OPSLY_ROOT?.trim() || process.cwd();
  return path.join(root, 'runtime', 'sessions', 'logs', 'mcp-runtime-audit.log');
}

export async function appendRuntimeAudit(entry: RuntimeAuditEntry): Promise<void> {
  const logPath = auditLogPath();
  await mkdir(path.dirname(logPath), { recursive: true });
  const line = JSON.stringify(entry);
  await appendFile(logPath, `${line}\n`, { encoding: 'utf8', flag: 'a' });
}
