import { postPeskidsLeadWithCRM } from '@/lib/peskids-canonical-api';
import { supabaseServer } from '@/lib/supabase';
import {
  isMissingPlatformPeskidsTable,
  mapPlatformLeadStatus,
  type PlatformPeskidsLeadRow,
} from '@/lib/peskids-platform-read';
import { updateLeadForAdmin } from '@/lib/services/lead-admin.service';

export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D+/g, '');
}

function phonesMatch(a: string, b: string): boolean {
  const da = normalizePhoneDigits(a);
  const db = normalizePhoneDigits(b);
  if (!da || !db) {
    return false;
  }
  if (da === db) {
    return true;
  }
  const tailA = da.slice(-10);
  const tailB = db.slice(-10);
  return tailA.length >= 8 && tailA === tailB;
}

function platformLeadsFrom() {
  const client = supabaseServer() as {
    schema: (name: string) => {
      from: (tableName: string) => ReturnType<ReturnType<typeof supabaseServer>['from']>;
    };
  };
  return client.schema('platform').from('peskids_leads');
}

type LeadPhoneRow = Pick<PlatformPeskidsLeadRow, 'id' | 'full_name' | 'status' | 'phone'>;

export async function findLeadByPhone(
  tenantSlug: string,
  phone: string
): Promise<{ id: string; status: string; name: string } | null> {
  const digits = normalizePhoneDigits(phone);
  if (!digits) {
    return null;
  }

  const { data, error } = await platformLeadsFrom()
    .select('id, full_name, status, phone')
    .eq('tenant_slug', tenantSlug)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    if (isMissingPlatformPeskidsTable(error)) {
      return findLegacyLeadByPhone(tenantSlug, phone);
    }
    throw error;
  }

  const rows = (data ?? []) as LeadPhoneRow[];
  const match = rows.find((row) =>
    phonesMatch(String(row.phone ?? ''), phone)
  );

  if (!match) {
    return findLegacyLeadByPhone(tenantSlug, phone);
  }

  return {
    id: match.id,
    status: mapPlatformLeadStatus(match.status),
    name: match.full_name,
  };
}

async function findLegacyLeadByPhone(
  tenantSlug: string,
  phone: string
): Promise<{ id: string; status: string; name: string } | null> {
  const { data, error } = await supabaseServer()
    .from('leads')
    .select('id, name, status, phone')
    .eq('tenant_id', tenantSlug)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    throw error;
  }

  const legacyRows = (data ?? []) as Array<{ id: string; name: string | null; status: string | null; phone: string | null }>;
  const match = legacyRows.find((row) => phonesMatch(String(row.phone ?? ''), phone));
  if (!match) {
    return null;
  }

  return {
    id: String(match.id),
    status: String(match.status ?? 'new'),
    name: String(match.name ?? 'Contacto'),
  };
}

function syntheticWhatsAppEmail(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  return `wa+${digits || 'unknown'}@inbox.peskids.local`;
}

export async function ensureLeadForWhatsAppInbound(params: {
  tenantSlug: string;
  phone: string;
  contactName: string;
  requestId: string;
}): Promise<{ leadId: string; created: boolean; linked: boolean }> {
  const existing = await findLeadByPhone(params.tenantSlug, params.phone);
  if (existing) {
    if (existing.status === 'new') {
      await updateLeadForAdmin(existing.id, params.tenantSlug, { status: 'contacted' });
    }
    return { leadId: existing.id, created: false, linked: true };
  }

  const result = await postPeskidsLeadWithCRM(
    {
      name: params.contactName,
      email: syntheticWhatsAppEmail(params.phone),
      phone: params.phone,
      grade_interested: 'Other',
      class_modality: 'llanogrande',
      neighborhood: 'Por confirmar',
      referral_source: 'whatsapp',
    },
    params.requestId
  );

  if (!result.ok) {
    throw new Error(result.error);
  }

  return { leadId: result.leadId, created: true, linked: true };
}
