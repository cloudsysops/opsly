import { getServiceClient } from '@/lib/supabase'
import type { PeskidsIntakeProfile } from '@/lib/peskids-intake'
import { gradeInterestedLabel } from '@/lib/peskids-intake-messages'

/** Registra lead en Supabase cuando el intake conversacional está completo. */
export async function submitLeadFromIntake(profile: PeskidsIntakeProfile): Promise<{ ok: boolean }> {
  if (
    !profile.parentName ||
    !profile.email ||
    !profile.classModality ||
    !profile.neighborhood ||
    !profile.gradeInterested
  ) {
    return { ok: false }
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return { ok: false }
  }

  try {
    const supabase = getServiceClient()
    const tenantId = process.env.NEXT_PUBLIC_TENANT_ID || 'peskids'
    const { error } = await supabase.from('leads').insert({
      tenant_id: tenantId,
      name: profile.parentName,
      email: profile.email,
      phone: profile.phone?.trim() ? profile.phone.trim() : null,
      class_modality: profile.classModality,
      neighborhood: profile.neighborhood,
      grade_interested: profile.gradeInterested,
      referral_source: profile.referralSource?.trim() ? profile.referralSource.trim() : 'chat-intake',
      status: 'new',
    })

    if (error) {
      console.error('Lead from intake failed:', error.message)
      return { ok: false }
    }

    const opslyBase = process.env.OPSLY_API_BASE_URL?.replace(/\/$/, '')
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
        }),
        signal: AbortSignal.timeout(12_000),
      }).catch((err) => {
        console.warn('Lead mirror to Opsly API failed:', err)
      })
    }

    return { ok: true }
  } catch (err) {
    console.error('submitLeadFromIntake error:', err)
    return { ok: false }
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
    .join(' · ')
}
