import { randomUUID } from 'node:crypto';

export interface ReferralLink {
  id: string;
  tenant_slug: string;
  referrer_id: string;
  referrer_name: string;
  code: string;
  expires_at: string;
  created_at: string;
}

export interface ReferralRedemption {
  id: string;
  tenant_slug: string;
  referral_link_id: string;
  referee_contact_id: string;
  referee_email: string;
  status: 'pending' | 'completed' | 'failed';
  reward?: string | null;
  redeemed_at: string;
  completed_at?: string | null;
  failure_reason?: string | null;
}

export interface ReferralStats {
  totalLinks: number;
  linksActive: number;
  linksExpired: number;
  totalClicks: number;
  totalRedemptions: number;
  completedRedemptions: number;
}

interface ReferralLinkRow {
  id: string;
  tenant_slug: string;
  referrer_id: string;
  referrer_name: string;
  code: string;
  expires_at: string;
  created_at: string;
}

interface ReferralRedemptionRow {
  id: string;
  tenant_slug: string;
  referral_link_id: string;
  referee_contact_id: string;
  referee_email: string;
  status: 'pending' | 'completed' | 'failed';
  reward?: string | null;
  redeemed_at: string;
  completed_at?: string | null;
  failure_reason?: string | null;
}

function tenantSlug(): string {
  return (process.env.NEXT_PUBLIC_TENANT_ID || 'peskids').trim().toLowerCase();
}

async function referralDb(): Promise<any> {
  const { supabaseServer } = await import('@/lib/supabase');
  return supabaseServer().schema('peskids');
}

function toLink(row: ReferralLinkRow): ReferralLink {
  return row;
}

function toRedemption(row: ReferralRedemptionRow): ReferralRedemption {
  return row;
}

export class ReferralService {
  constructor(private readonly db?: any) {}

  private async getDb(): Promise<any> {
    return this.db ?? (await referralDb());
  }

  private async getLinkByCode(code: string): Promise<ReferralLink | null> {
    const db = await this.getDb();
    const { data, error } = await db
      .from('referral_links')
      .select('id, tenant_slug, referrer_id, referrer_name, code, expires_at, created_at')
      .eq('tenant_slug', tenantSlug())
      .eq('code', code)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return toLink(data as ReferralLinkRow);
  }

  async generateReferralLink(
    referrerId: string,
    referrerName: string,
    expiryDays = 90
  ): Promise<ReferralLink> {
    const createdAt = new Date();
    const expiresAt = new Date(createdAt);
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    const code = `PESKIDS_${randomUUID().slice(0, 8).toUpperCase()}`;
    const payload = {
      tenant_slug: tenantSlug(),
      referrer_id: referrerId,
      referrer_name: referrerName,
      code,
      expires_at: expiresAt.toISOString(),
      created_at: createdAt.toISOString(),
    };

    const db = await this.getDb();
    const { data, error } = await db
      .from('referral_links')
      .insert(payload)
      .select('id, tenant_slug, referrer_id, referrer_name, code, expires_at, created_at')
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to create referral link');
    }

    return toLink(data as ReferralLinkRow);
  }

  async trackReferralClick(code: string, ipAddress: string, userAgent: string): Promise<void> {
    const link = await this.getLinkByCode(code);
    if (!link) {
      throw new Error(`Invalid referral code: ${code}`);
    }

    if (new Date(link.expires_at).getTime() < Date.now()) {
      throw new Error(`Referral link expired: ${code}`);
    }

    const payload = {
      referral_link_id: link.id,
      ip_address: ipAddress,
      user_agent: userAgent,
      created_at: new Date().toISOString(),
    };

    const db = await this.getDb();
    const { error } = await db.from('referral_clicks').insert(payload);
    if (error) {
      throw new Error(error.message);
    }
  }

  async redeemReferral(
    code: string,
    refereeContactId: string,
    refereeEmail: string
  ): Promise<ReferralRedemption> {
    const link = await this.getLinkByCode(code);
    if (!link) {
      throw new Error(`Invalid referral code: ${code}`);
    }

    if (new Date(link.expires_at).getTime() < Date.now()) {
      throw new Error('Referral link expired');
    }

    if (link.referrer_id === refereeContactId) {
      throw new Error('Cannot redeem own referral link');
    }

    const payload = {
      tenant_slug: tenantSlug(),
      referral_link_id: link.id,
      referee_contact_id: refereeContactId,
      referee_email: refereeEmail,
      status: 'pending' as const,
      redeemed_at: new Date().toISOString(),
      completed_at: null,
      failure_reason: null,
      reward: null,
    };

    const db = await this.getDb();
    const { data, error } = await db
      .from('referral_redemptions')
      .insert(payload)
      .select(
        'id, tenant_slug, referral_link_id, referee_contact_id, referee_email, status, reward, redeemed_at, completed_at, failure_reason'
      )
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? 'Failed to redeem referral');
    }

    return toRedemption(data as ReferralRedemptionRow);
  }

  async completeReferralRedemption(
    redemptionId: string,
    reward?: string
  ): Promise<ReferralRedemption> {
    const db = await this.getDb();
    const { data, error } = await db
      .from('referral_redemptions')
      .update({
        status: 'completed',
        reward: reward ?? null,
        completed_at: new Date().toISOString(),
      })
      .eq('tenant_slug', tenantSlug())
      .eq('id', redemptionId)
      .select(
        'id, tenant_slug, referral_link_id, referee_contact_id, referee_email, status, reward, redeemed_at, completed_at, failure_reason'
      )
      .single();

    if (error || !data) {
      throw new Error(error?.message ?? `Failed to complete referral redemption ${redemptionId}`);
    }

    return toRedemption(data as ReferralRedemptionRow);
  }

  async getReferralStats(referrerId: string): Promise<ReferralStats> {
    const now = Date.now();

    const db = await this.getDb();
    const { data: links, error: linksError } = await db
      .from('referral_links')
      .select('id, expires_at')
      .eq('tenant_slug', tenantSlug())
      .eq('referrer_id', referrerId);

    if (linksError) {
      throw new Error(linksError.message);
    }

    const referralLinks = (links ?? []) as Array<Pick<ReferralLinkRow, 'id' | 'expires_at'>>;
    const linkIds = referralLinks.map((row) => row.id);

    let totalClicks = 0;
    let totalRedemptions = 0;
    let completedRedemptions = 0;

    for (const linkId of linkIds) {
      const [{ count: clickCount }, { count: redemptionCount }, { count: completedCount }] =
        await Promise.all([
          db
            .from('referral_clicks')
            .select('id', { count: 'exact', head: true })
            .eq('referral_link_id', linkId),
          db
            .from('referral_redemptions')
            .select('id', { count: 'exact', head: true })
            .eq('referral_link_id', linkId),
          db
            .from('referral_redemptions')
            .select('id', { count: 'exact', head: true })
            .eq('referral_link_id', linkId)
            .eq('status', 'completed'),
        ]);

      totalClicks += clickCount ?? 0;
      totalRedemptions += redemptionCount ?? 0;
      completedRedemptions += completedCount ?? 0;
    }

    const activeLinks = referralLinks.filter((row) => new Date(row.expires_at).getTime() > now).length;

    return {
      totalLinks: referralLinks.length,
      linksActive: activeLinks,
      linksExpired: referralLinks.length - activeLinks,
      totalClicks,
      totalRedemptions,
      completedRedemptions,
    };
  }
}

export const referralService = new ReferralService();
