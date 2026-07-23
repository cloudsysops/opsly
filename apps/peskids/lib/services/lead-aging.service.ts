import { supabaseServer } from '@/lib/supabase';
import {
  agingIdempotencyKey,
  agingWindowKey,
  resolveLeadAgingBucket,
  type LeadAgingBucket,
} from '@/lib/lead-aging';
import {
  getPeskidsContactSlaHours,
  isPeskidsAutoCreateFollowupEnabled,
  isPeskidsLeadEscalation48hEnabled,
  isPeskidsLeadReminder24hEnabled,
  isPeskidsOperationalNotificationsEnabled,
  isPeskidsTrialReminderEnabled,
} from '@/lib/peskids-pro-flags';
import { createFollowup } from '@/lib/services/followup-admin.service';

export type AgingAlertKind =
  | 'lead_reminder_24h'
  | 'lead_escalation_48h'
  | 'followup_overdue'
  | 'trial_unconfirmed';

export type AgingScanResult = {
  scanned_leads: number;
  reminder_24h: number;
  escalation_48h: number;
  overdue_followups: number;
  trial_reminders: number;
  skipped: number;
  failed: number;
  auto_followups_created: number;
};

type PlatformLeadRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  created_at: string;
};

const PESKIDS_N8N_OPERATIONAL_NOTIFY_PATH = '/peskids-operational-notify';

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

function platformFrom(table: string) {
  const client = supabaseServer() as {
    schema: (name: string) => {
      from: (tableName: string) => ReturnType<ReturnType<typeof supabaseServer>['from']>;
    };
  };
  return client.schema('platform').from(table);
}

function adminInteresadosUrl(): string {
  const base =
    process.env.PESKIDS_APP_URL?.trim().replace(/\/$/, '') ||
    process.env.NEXT_PUBLIC_PESKIDS_SITE_URL?.trim().replace(/\/$/, '') ||
    'https://peskids.op-sly.com';
  return `${base}/admin#interesados`;
}

async function claimIdempotency(input: {
  kind: AgingAlertKind;
  entityType: 'lead' | 'followup' | 'trial';
  entityId: string;
  windowKey: string;
}): Promise<{ claimed: boolean; key: string }> {
  const key = agingIdempotencyKey(input.kind, input.entityId, input.windowKey);
  const { error } = await platformFrom('peskids_aging_alert_deliveries').insert({
    tenant_slug: tenantSlug(),
    alert_kind: input.kind,
    entity_type: input.entityType,
    entity_id: input.entityId,
    idempotency_key: key,
    status: 'pending',
  });

  if (error) {
    const code = (error as { code?: string }).code;
    const msg = error.message?.toLowerCase() ?? '';
    if (code === '23505' || msg.includes('duplicate') || msg.includes('unique')) {
      return { claimed: false, key };
    }
    console.warn('[lead-aging] idempotency insert failed', error.message);
    return { claimed: false, key };
  }
  return { claimed: true, key };
}

async function markDelivery(
  key: string,
  status: 'sent' | 'failed' | 'skipped',
  detail: string
): Promise<void> {
  const patch: Record<string, string | null> = {
    status,
    detail: detail.slice(0, 500),
    updated_at: new Date().toISOString(),
  };
  if (status === 'sent') {
    patch.sent_at = new Date().toISOString();
  }
  await platformFrom('peskids_aging_alert_deliveries')
    .update(patch)
    .eq('idempotency_key', key);
}

async function dispatchOperationalNotify(content: string): Promise<{
  ok: boolean;
  detail: string;
}> {
  if (!isPeskidsOperationalNotificationsEnabled()) {
    return { ok: true, detail: 'operational notifications disabled' };
  }
  const base = process.env.N8N_WEBHOOK_BASE_URL?.trim().replace(/\/$/, '');
  if (!base) {
    return { ok: false, detail: 'N8N_WEBHOOK_BASE_URL not configured' };
  }
  try {
    const response = await fetch(`${base}${PESKIDS_N8N_OPERATIONAL_NOTIFY_PATH}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        enabled: true,
        content,
        event_type: 'aging.alert',
        tenant_slug: tenantSlug(),
      }),
    });
    if (!response.ok) {
      return { ok: false, detail: `n8n returned ${response.status}` };
    }
    return { ok: true, detail: 'queued in n8n' };
  } catch (err) {
    return {
      ok: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

function kindForBucket(bucket: Exclude<LeadAgingBucket, 'none'>): AgingAlertKind {
  return bucket === 'escalation_48h' ? 'lead_escalation_48h' : 'lead_reminder_24h';
}

async function processLeadAging(
  lead: PlatformLeadRow,
  now: Date,
  windowKey: string,
  result: AgingScanResult
): Promise<void> {
  const slaHours = getPeskidsContactSlaHours();
  const bucket = resolveLeadAgingBucket(lead.status, lead.created_at, now, 24, slaHours);
  if (bucket === 'none') return;

  if (bucket === 'reminder_24h' && !isPeskidsLeadReminder24hEnabled()) {
    result.skipped += 1;
    return;
  }
  if (bucket === 'escalation_48h' && !isPeskidsLeadEscalation48hEnabled()) {
    result.skipped += 1;
    return;
  }

  const kind = kindForBucket(bucket);
  const claim = await claimIdempotency({
    kind,
    entityType: 'lead',
    entityId: lead.id,
    windowKey,
  });
  if (!claim.claimed) {
    result.skipped += 1;
    return;
  }

  const label = bucket === 'escalation_48h' ? 'ESCALACIÓN 48h' : 'Recordatorio 24h';
  const content = [
    `Peskids ${label}: ${lead.full_name ?? 'sin nombre'}`,
    `Estado: ${lead.status}`,
    lead.phone ? `Tel: ${lead.phone}` : null,
    lead.email ? `Email: ${lead.email}` : null,
    adminInteresadosUrl(),
  ]
    .filter(Boolean)
    .join('\n');

  const notified = await dispatchOperationalNotify(content);
  if (!notified.ok) {
    await markDelivery(claim.key, 'failed', notified.detail);
    result.failed += 1;
    return;
  }

  await markDelivery(claim.key, notified.detail.includes('disabled') ? 'skipped' : 'sent', notified.detail);
  if (bucket === 'escalation_48h') {
    result.escalation_48h += 1;
    if (isPeskidsAutoCreateFollowupEnabled()) {
      try {
        const due = new Date(now);
        due.setDate(due.getDate() + 1);
        await createFollowup({
          contact_id: lead.id,
          contact_type: 'lead',
          type: 'call',
          due_date: due.toISOString().slice(0, 10),
          notes: 'Auto: escalación 48h sin contacto (PR-PRO-5)',
        });
        result.auto_followups_created += 1;
      } catch (err) {
        console.warn('[lead-aging] auto followup failed', err);
      }
    }
  } else {
    result.reminder_24h += 1;
  }
}

async function processOverdueFollowups(
  now: Date,
  windowKey: string,
  result: AgingScanResult
): Promise<void> {
  if (!isPeskidsLeadReminder24hEnabled() && !isPeskidsLeadEscalation48hEnabled()) {
    return;
  }
  const today = now.toISOString().slice(0, 10);
  const { data, error } = await supabaseServer()
    .from('followups')
    .select('id, contact_id, contact_type, type, due_date, status')
    .eq('tenant_id', tenantSlug())
    .eq('status', 'pending')
    .lt('due_date', today)
    .limit(100);

  if (error) {
    console.warn('[lead-aging] overdue followups query failed', error.message);
    return;
  }

  for (const row of data ?? []) {
    const claim = await claimIdempotency({
      kind: 'followup_overdue',
      entityType: 'followup',
      entityId: row.id,
      windowKey,
    });
    if (!claim.claimed) {
      result.skipped += 1;
      continue;
    }
    const content = `Peskids seguimiento vencido (${row.type}) due ${row.due_date} — ${adminInteresadosUrl()}`;
    const notified = await dispatchOperationalNotify(content);
    if (!notified.ok) {
      await markDelivery(claim.key, 'failed', notified.detail);
      result.failed += 1;
      continue;
    }
    await markDelivery(
      claim.key,
      notified.detail.includes('disabled') ? 'skipped' : 'sent',
      notified.detail
    );
    result.overdue_followups += 1;
  }
}

async function processTrialReminders(
  now: Date,
  windowKey: string,
  result: AgingScanResult
): Promise<void> {
  if (!isPeskidsTrialReminderEnabled()) return;

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const day = tomorrow.toISOString().slice(0, 10);

  const { data, error } = await supabaseServer()
    .from('trial_classes')
    .select('id, lead_id, scheduled_date, status')
    .eq('tenant_id', tenantSlug())
    .eq('scheduled_date', day)
    .in('status', ['scheduled'])
    .limit(100);

  if (error) {
    console.warn('[lead-aging] trial reminder query failed', error.message);
    return;
  }

  for (const row of data ?? []) {
    const claim = await claimIdempotency({
      kind: 'trial_unconfirmed',
      entityType: 'trial',
      entityId: row.id,
      windowKey,
    });
    if (!claim.claimed) {
      result.skipped += 1;
      continue;
    }
    const content = `Peskids trial mañana (${row.scheduled_date}) sin confirmar — lead ${row.lead_id} — ${adminInteresadosUrl()}`;
    const notified = await dispatchOperationalNotify(content);
    if (!notified.ok) {
      await markDelivery(claim.key, 'failed', notified.detail);
      result.failed += 1;
      continue;
    }
    await markDelivery(
      claim.key,
      notified.detail.includes('disabled') ? 'skipped' : 'sent',
      notified.detail
    );
    result.trial_reminders += 1;
  }
}

/**
 * Hourly aging scan. Never throws to the HTTP layer for partial CRM/n8n failures —
 * returns counters. Feature flags default off so production is unchanged.
 */
export async function runLeadAgingScan(now: Date = new Date()): Promise<AgingScanResult> {
  const result: AgingScanResult = {
    scanned_leads: 0,
    reminder_24h: 0,
    escalation_48h: 0,
    overdue_followups: 0,
    trial_reminders: 0,
    skipped: 0,
    failed: 0,
    auto_followups_created: 0,
  };

  const anyLeadFlag =
    isPeskidsLeadReminder24hEnabled() || isPeskidsLeadEscalation48hEnabled();
  const windowKey = agingWindowKey(now);

  if (anyLeadFlag) {
    const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await platformFrom('peskids_leads')
      .select('id, full_name, email, phone, status, created_at')
      .eq('tenant_slug', tenantSlug())
      .lte('created_at', cutoff)
      .order('created_at', { ascending: true })
      .limit(200);

    if (error) {
      console.warn('[lead-aging] leads query failed', error.message);
    } else {
      const rows = (data ?? []) as PlatformLeadRow[];
      result.scanned_leads = rows.length;
      for (const lead of rows) {
        await processLeadAging(lead, now, windowKey, result);
      }
    }
  }

  await processOverdueFollowups(now, windowKey, result);
  await processTrialReminders(now, windowKey, result);

  console.info(
    JSON.stringify({
      component: 'peskids.lead_aging',
      ...result,
      window_key: windowKey,
    })
  );

  return result;
}
