import type { PeskidsIntakeProfile } from '@/lib/peskids-intake';
import { gradeInterestedLabel } from '@/lib/peskids-intake-messages';
import { postPeskidsLeadWithGHL } from '@/lib/peskids-canonical-api';

/** Registra interesado vía la misma API canónica que POST /api/leads. */
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

  const requestId = crypto.randomUUID();
  const referralSource = profile.referralSource?.trim() || 'whatsapp';

  const result = await postPeskidsLeadWithGHL(
    {
      name: profile.parentName,
      email: profile.email,
      phone: profile.phone,
      class_modality: profile.classModality,
      neighborhood: profile.neighborhood,
      grade_interested: profile.gradeInterested,
      referral_source: referralSource,
    },
    requestId
  );

  if (!result.ok) {
    console.error('Lead from intake failed:', result.error, { request_id: requestId });
    return { ok: false };
  }

  return { ok: true };
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
