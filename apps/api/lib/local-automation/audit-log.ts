import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

import type { AutomationAuditEvent } from './types';
import { resolveOpslyRepoRoot } from '../tools-execute';

const auditPath = path.join(resolveOpslyRepoRoot(), 'runtime', 'logs', 'local-automation.jsonl');

export async function appendAutomationAuditEvent(
  event: Omit<AutomationAuditEvent, 'id' | 'ts'>
): Promise<AutomationAuditEvent> {
  const fullEvent: AutomationAuditEvent = {
    id: randomUUID(),
    ts: new Date().toISOString(),
    ...event,
  };
  await mkdir(path.dirname(auditPath), { recursive: true });
  await writeFile(auditPath, `${JSON.stringify(fullEvent)}\n`, { flag: 'a' });
  return fullEvent;
}

export async function readAutomationAuditEvents(limit = 50): Promise<AutomationAuditEvent[]> {
  try {
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
