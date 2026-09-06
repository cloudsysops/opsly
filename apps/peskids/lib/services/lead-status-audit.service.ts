import { supabaseServer } from '@/lib/supabase';

export type LeadStatusAuditAction =
  | 'status_change'
  | 'note_update'
  | 'teacher_assign'
  | 'hold'
  | 'convert'
  | 'cancel';

type LeadStatusAuditInsert = {
  tenant_slug: string;
  lead_id: string;
  old_status: string | null;
  new_status: string;
  action: LeadStatusAuditAction;
  metadata: Record<string, unknown>;
};

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

function auditTable() {
  const client = supabaseServer() as unknown as {
    from: (tableName: string) => {
      insert: (row: LeadStatusAuditInsert) => Promise<{ error: { message: string } | null }>;
    };
  };
  return client.from('lead_status_audit');
}

/** Best-effort audit: a missing audit table must never block a lead update. */
export async function recordLeadStatusAudit(input: {
  leadId: string;
  oldStatus: string | null;
  newStatus: string;
  action: LeadStatusAuditAction;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const { error } = await auditTable().insert({
      tenant_slug: tenantSlug(),
      lead_id: input.leadId,
      old_status: input.oldStatus,
      new_status: input.newStatus,
      action: input.action,
      metadata: input.metadata ?? {},
    });
    if (error) {
      console.warn('lead_status_audit insert failed', { error, lead_id: input.leadId });
    }
  } catch (error) {
    console.warn('lead_status_audit unavailable', { error, lead_id: input.leadId });
  }
}
