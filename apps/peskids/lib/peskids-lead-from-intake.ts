import type { PeskidsIntakeProfile } from '@/lib/peskids-intake';
import { gradeInterestedLabel } from '@/lib/peskids-intake-messages';
import { postPeskidsLeadWithCRM } from '@/lib/peskids-canonical-api';

/** Registra interesado vía la misma API canónica que POST /api/leads. */
export async function submitLeadFromIntake(
  profile: PeskidsIntakeProfile
): Promise<{ ok: boolean; leadId?: string }> {
  const leadType = profile.applicantRole ?? 'family';

  if (!profile.parentName || !profile.email || !profile.phone || profile.consentTreatment !== 'yes') {
    return { ok: false };
  }

  if (leadType === 'family') {
    if (!profile.classModality || !profile.neighborhood || !profile.gradeInterested) {
      return { ok: false };
    }
  }

  if (leadType === 'company' && !profile.companyName) {
    return { ok: false };
  }

  const classModality = profile.classModality ?? 'llanogrande';
  const neighborhood =
    classModality === 'llanogrande'
      ? profile.neighborhood ?? 'Llanogrande'
      : profile.neighborhood ?? 'Por confirmar';
  const gradeInterested = profile.gradeInterested ?? 'Other';
  const requestId = crypto.randomUUID();
  const referralSource = profile.referralSource?.trim() || 'web';

  const result = await postPeskidsLeadWithCRM(
    {
      name: profile.parentName,
      email: profile.email,
      phone: profile.phone,
      lead_type: leadType,
      class_modality: classModality,
      neighborhood,
      grade_interested: gradeInterested,
      child_name: profile.childName,
      company_name: profile.companyName,
      referral_source: referralSource,
      metadata: {
        intake_channel: 'web_chat',
        applicant_role: leadType,
        consent_treatment: true,
        special_condition: profile.specialCondition ?? null,
        special_condition_details: profile.specialConditionDetails ?? null,
        teacher_preference: profile.teacherPreference ?? null,
        child_age: profile.childAge ?? null,
      },
    },
    requestId
  );

  if (!result.ok) {
    console.error('Lead from intake failed:', result.error, { request_id: requestId });
    return { ok: false };
  }

  return { ok: true, leadId: result.leadId };
}

export function intakeProfileSummary(profile: PeskidsIntakeProfile): string {
  return [
    profile.applicantRole,
    profile.parentName,
    profile.email,
    profile.phone,
    profile.classModality,
    profile.neighborhood,
    gradeInterestedLabel(profile.gradeInterested),
    profile.companyName,
  ]
    .filter(Boolean)
    .join(' · ');
}
