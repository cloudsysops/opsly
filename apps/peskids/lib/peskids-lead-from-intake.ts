import { getServiceClient } from '@/lib/supabase';
import type { PeskidsIntakeProfile } from '@/lib/peskids-intake';
import { gradeInterestedLabel } from '@/lib/peskids-intake-messages';
import { buildPeskidsReferralCode } from '@/lib/peskids-referrals';
import { sendLeadToGHL } from '@/lib/gohighlevel-lead-sync';

/** Registra lead en Supabase cuando el intake conversacional está completo. */
export async function submitLeadFromIntake(
  profile: PeskidsIntakeProfile
): Promise<{ ok: boolean }> {
  if (
    !profile.parentName ||
    !profile.email ||
    !profile.classModality ||
    !profile.neighborhood ||
    !profile.gradeInterested
  ) {
    return { ok: false };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false };
  }

  let ghlContactId: string | null = null;

  try {
    const ghlResult = await sendLeadToGHL({
      parentName: profile.parentName,
      email: profile.email,
      phone: profile.phone,
      childName: profile.childName,
      childAge: profile.childAge,
      gradeInterested: profile.gradeInterested,
      source: profile.referralSource?.trim() || 'chat-intake',
    });
    if (ghlResult) {
      ghlContactId = ghlResult.ghlContactId;
    }

    const supabase = getServiceClient();
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids';
    const { data, error } = await supabase
      .from('leads')
      .insert({
        tenant_id: tenantId,
        name: profile.parentName,
        email: profile.email,
        phone: profile.phone?.trim() ? profile.phone.trim() : null,
        class_modality: profile.classModality,
        neighborhood: profile.neighborhood,
        grade_interested: profile.gradeInterested,
        referral_source: profile.referralSource?.trim()
          ? profile.referralSource.trim()
          : 'chat-intake',
        referral_discount_cents: 0,
        referral_redemptions: 0,
        status: 'new',
        ghl_contact_id: ghlContactId,
      })
      .select('id, referral_code');

    if (error) {
      console.error('Lead from intake failed:', error.message);
      return { ok: false };
    }

    const lead = data?.[0];
    if (lead?.id && !lead.referral_code) {
      const referralCode = buildPeskidsReferralCode({
        tenantId,
        leadId: lead.id,
        email: profile.email,
      });
      const { error: referralUpdateError } = await supabase
        .from('leads')
        .update({ referral_code: referralCode })
        .eq('id', lead.id);
      if (referralUpdateError) {
        console.warn('Referral code persistence failed:', referralUpdateError.message);
      }
    }

    const opslyBase = process.env.OPSLY_API_BASE_URL?.replace(/\/$/, '');
    if (opslyBase) {
      void fetch(`${opslyBase}/api/public/tenants/peskids/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: profile.parentName,
          email: profile.email,
          phone: profile.phone,
          class_modality: profile.classModality,
          neighborhood: profile.neighborhood,
          grade_interested: profile.gradeInterested,
          referral_source: profile.referralSource ?? 'chat-intake',
          ghl_contact_id: ghlContactId,
        }),
        signal: AbortSignal.timeout(12_000),
      }).catch((err) => {
        console.warn('Lead mirror to Opsly API failed:', err);
      });
    }

    const n8nWebhook = process.env.NEXT_PUBLIC_N8N_LEAD_WEBHOOK || 'https://n8n-peskids.op-sly.com/webhook/peskids-lead';
    void fetch(n8nWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: profile.parentName,
        email: profile.email,
        phone: profile.phone,
        source: 'chat-intake',
        class_modality: profile.classModality,
        neighborhood: profile.neighborhood,
        grade_interested: profile.gradeInterested,
        referral_source: profile.referralSource ?? 'chat-intake',
        ghl_contact_id: ghlContactId,
      }),
      signal: AbortSignal.timeout(8_000),
    }).catch((err) => {
      console.warn('N8N webhook mirror failed:', err);
    });

    return { ok: true };
  } catch (err) {
    console.error('submitLeadFromIntake error:', err);
    return { ok: false };
  }
}

export function intakeProfileSummary(profile: PeskidsIntakeProfile): string {
  return [
    profile.parentName,
    profile.email,
    profile.phone,
    profile.classModality,
    profile.neighborhood,
    gradeInterestedLabel(profile.gradeInterested),
  ]
    .filter(Boolean)
    .join(' · ');
}
