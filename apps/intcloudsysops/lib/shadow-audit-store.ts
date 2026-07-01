/** In-memory shadow audit log — no production DB writes. */

export interface ShadowAuditEntry {
  id: string;
  tenant_slug: string;
  channel: string;
  sender: string | null;
  raw_input: string;
  utterance: string | null;
  intent: string | null;
  shadow: true;
  reply: string;
  trace_id: string;
  created_at: string;
}

const entries: ShadowAuditEntry[] = [];

export function appendShadowAudit(entry: Omit<ShadowAuditEntry, 'id' | 'created_at' | 'shadow'>): ShadowAuditEntry {
  const row: ShadowAuditEntry = {
    ...entry,
    id: crypto.randomUUID(),
    shadow: true,
    created_at: new Date().toISOString(),
  };
  entries.unshift(row);
  if (entries.length > 100) {
    entries.length = 100;
  }
  return row;
}

export function listShadowAudit(limit = 50): readonly ShadowAuditEntry[] {
  return entries.slice(0, limit);
}
