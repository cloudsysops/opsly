/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { getServiceClient } from '@/lib/supabase';
import { buildPeskidsReferralCode, PESKIDS_REFERRAL_DISCOUNT_CENTS } from '@/lib/peskids-referrals';
import { buildPeskidsReferralLink, normalizeReferralCode } from '@/lib/peskids-referral-links';

type LeadBody = {
  name: string;
  email: string;
  phone?: string;
  class_modality?: 'llanogrande' | 'domicilio';
  neighborhood?: string;
  grade_interested: string;
  referral_source?: string;
  referral_code?: string;
  referred_by_code?: string;
  // Ley 1581 consent fields — stored in governance.consents (Phase 3)
  consent_treatment?: boolean;
  consent_marketing?: boolean;
  consent_policy_version?: string;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LeadBody;

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
      return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
    }

    const supabase = getServiceClient();
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids';
    const referredByCode = normalizeReferralCode(body.referred_by_code);

    // Consent audit log — governance.consents table wired in Phase 3
    if (!body.consent_treatment) {
      return NextResponse.json({ error: 'Consent required' }, { status: 400 });
    }
    console.warn('[peskids][lead] consent', {
      treatment: body.consent_treatment,
      marketing: body.consent_marketing ?? false,
      policy_version: body.consent_policy_version,
    });

    const leadPayload = {
      tenant_id: tenantId,
      name: body.name,
      email: body.email,
      phone: body.phone?.trim() ? body.phone.trim() : null,
      class_modality: body.class_modality || null,
      neighborhood: body.neighborhood || null,
      grade_interested: body.grade_interested,
      referral_source: body.referral_source?.trim() ? body.referral_source.trim() : null,
      status: 'new' as const,
    };

    const leadPayloadWithReferrals = {
      ...leadPayload,
      referral_code: body.referral_code?.trim() ? body.referral_code.trim().toUpperCase() : null,
      referred_by_code: referredByCode,
      referral_discount_cents: 0,
      referral_redemptions: 0,
    };

    let supportsReferralColumns = true;

    let insertResult = await supabase
      .from('leads')
      .insert(leadPayloadWithReferrals as any)
      .select();

    if (
      insertResult.error &&
      /referral_(code|discount_cents|redemptions)|referred_by_code/i.test(
        insertResult.error.message
      )
    ) {
      supportsReferralColumns = false;

      insertResult = await supabase
        .from('leads')
        .insert(leadPayload as any)
        .select();
    }

    const { data, error } = insertResult;

    if (error) {
      console.error('Lead insertion failed:', error.message);
      return NextResponse.json({ error: 'Failed to create lead' }, { status: 400 });
    }

    const lead = data?.[0];

    let referralCode = supportsReferralColumns ? (lead?.referral_code ?? null) : null;
    if (supportsReferralColumns && lead?.id && !referralCode) {
      referralCode = buildPeskidsReferralCode({
        tenantId,
        leadId: lead.id,
        email: body.email,
      });

      const { error: updateError } = await supabase
        .from('leads')
        .update({ referral_code: referralCode })
        .eq('id', lead.id);

      if (updateError) {
        console.warn('Failed to persist referral code:', updateError.message);
      }
    }

    if (supportsReferralColumns && referredByCode) {
      const { error: referrerLookupError, data: referrerRows } = await supabase
        .from('leads')
        .select('id, referral_discount_cents, referral_redemptions')
        .eq('tenant_id', tenantId)
        .eq('referral_code', referredByCode)
        .limit(1);

      if (!referrerLookupError && referrerRows?.[0]) {
        const referrer = referrerRows[0];
        const nextDiscount =
          (referrer.referral_discount_cents ?? 0) + PESKIDS_REFERRAL_DISCOUNT_CENTS;
        const nextRedemptions = (referrer.referral_redemptions ?? 0) + 1;
        const { error: referrerUpdateError } = await supabase
          .from('leads')
          .update({
            referral_discount_cents: nextDiscount,
            referral_redemptions: nextRedemptions,
          })
          .eq('id', referrer.id);

        if (referrerUpdateError) {
          console.warn('Failed to update referrer credit:', referrerUpdateError.message);
        }
      }
    }

    const referralLink = referralCode ? buildPeskidsReferralLink(referralCode) : null;

    return NextResponse.json(
      {
        id: lead?.id,
        referral_code: referralCode,
        referral_link: referralLink,
        referral_discount_cents: supportsReferralColumns ? (lead?.referral_discount_cents ?? 0) : 0,
        message: 'Lead created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Peskids lead endpoint error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
