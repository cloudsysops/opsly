import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import type { AutomationAuditEvent } from './types';

function getRepoRoot(): string {
  return process.env.OPSLY_REPO_ROOT?.trim() || process.cwd();
}

function getAuditPath(): string {
  return path.join(getRepoRoot(), 'runtime', 'logs', 'local-automation.jsonl');
}

export async function appendAutomationAuditEvent(
  event: Omit<AutomationAuditEvent, 'id' | 'ts'>
): Promise<AutomationAuditEvent> {
  const fullEvent: AutomationAuditEvent = {
    id: randomUUID(),
    ts: new Date().toISOString(),
    ...event,
  };
  const auditPath = getAuditPath();
  await mkdir(path.dirname(auditPath), { recursive: true });
  await writeFile(auditPath, `${JSON.stringify(fullEvent)}\n`, { flag: 'a' });
  return fullEvent;
}

export async function readAutomationAuditEvents(limit = 50): Promise<AutomationAuditEvent[]> {
  try {
    const auditPath = getAuditPath();
    const raw = await readFile(auditPath, 'utf-8');
    return raw
      .trim()
      .split('\n')
      .filter(Boolean)
      .slice(-limit)
      .map((line) => JSON.parse(line) as AutomationAuditEvent)
      .reverse();
  } catch {
    return [];
  }
}
