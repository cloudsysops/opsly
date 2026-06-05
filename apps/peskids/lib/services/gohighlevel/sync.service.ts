import { supabaseServer } from '@/lib/supabase';
import { resolveGoHighLevelPeskidsEnv, GoHighLevelClient } from '@intcloudsysops/services/gohighlevel';

const TENANT_ID = process.env.PESKIDS_TENANT_ID || 'peskids-mvp';

export interface GhlLocalEntity {
  type: 'lead' | 'parent' | 'student';
  id: string;
}

export class GhlSyncService {
  private getClient(): GoHighLevelClient {
    const env = resolveGoHighLevelPeskidsEnv();
    if (!env.apiKey) {
      throw new Error('GOHIGHLEVEL_PESKIDS_API_KEY not configured');
    }
    return new GoHighLevelClient(env.apiKey, env.baseUrl, {
      locationId: env.locationId,
      apiVersion: env.apiVersion,
    });
  }

  async findByGhlContactId(ghlContactId: string): Promise<GhlLocalEntity | null> {
    const supabase = supabaseServer();

    const { data: lead } = await supabase
      .schema('public')
      .from('leads')
      .select('id')
      .eq('ghl_contact_id', ghlContactId)
      .limit(1)
      .maybeSingle();

    if (lead) return { type: 'lead', id: lead.id };

    // students/parents tables may not have ghl_contact_id in DB types — cast safely
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sResult = await (supabase as any).schema('public').from('students')
      .select('id').eq('ghl_contact_id', ghlContactId).limit(1).maybeSingle();
    const student = sResult.data as { id: string } | null;
    if (student) return { type: 'student', id: student.id };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pResult = await (supabase as any).schema('public').from('parents')
      .select('id').eq('ghl_contact_id', ghlContactId).limit(1).maybeSingle();
    const parent = pResult.data as { id: string } | null;
    if (parent) return { type: 'parent', id: parent.id };

    return null;
  }

  async syncFromGhlContact(ghlContactId: string): Promise<boolean> {
    const client = this.getClient();
    const supabase = supabaseServer();

    let contact;
    try {
      contact = await client.getContact(ghlContactId);
    } catch {
      return false;
    }

    if (!contact || !contact.id) return false;

    const local = await this.findByGhlContactId(ghlContactId);

    if (!local) {
      const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() || 'GHL Contact';
      const { data: inserted, error } = await supabase
        .schema('public').from('leads')
        .insert({
          tenant_id: TENANT_ID,
          name,
          email: contact.email?.trim() ?? '',
          phone: contact.phone?.trim() ?? null,
          grade_interested: '',
          referral_source: 'gohighlevel',
          status: 'new',
        })
        .select('id').single();

      if (error || !inserted) return false;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await supabase.schema('public').from('leads').update({ ghl_contact_id: ghlContactId } as any).eq('id', inserted.id);
      return true;
    }

    if (local.type === 'lead') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: any = { updated_at: new Date().toISOString() };
      const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
      if (name) updates.name = name;
      if (contact.email?.trim()) updates.email = contact.email.trim();
      if (contact.phone?.trim()) updates.phone = contact.phone.trim();
      const { error } = await supabase.schema('public').from('leads').update(updates).eq('id', local.id);
      if (error) return false;
      return true;
    }

    if (local.type === 'student') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updates: any = { updated_at: new Date().toISOString() };
      const name = [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim();
      if (name) updates.name = name;
      if (contact.email?.trim()) updates.parent_email = contact.email.trim();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error } = await (supabase as any).schema('public').from('students').update(updates).eq('id', local.id);
      if (error) return false;
      return true;
    }

    return false;
  }

  async backfillMissingGhlIds(): Promise<{ synced: number; failed: number }> {
    const client = this.getClient();
    const supabase = supabaseServer();
    const { data: leads, error } = await supabase
      .schema('public').from('leads').select('id, email, name')
      .is('ghl_contact_id', null).eq('tenant_id', TENANT_ID);
    if (error) return { synced: 0, failed: 0 };

    let synced = 0;
    let failed = 0;
    for (const lead of leads) {
      if (!lead.email) { failed += 1; continue; }
      try {
        const result = await client.getContacts({ search: lead.email, limit: 10 });
        const matching = result.data?.find(
          (c: { email?: string }) => c.email?.toLowerCase() === lead.email.toLowerCase()
        );
        if (matching?.id) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: ue } = await supabase.schema('public').from('leads').update({ ghl_contact_id: matching.id } as any).eq('id', lead.id);
          if (ue) { failed += 1; } else { synced += 1; }
        } else { failed += 1; }
      } catch { failed += 1; }
    }
    return { synced, failed };
  }
}

export const createGhlSyncService = () => new GhlSyncService();
