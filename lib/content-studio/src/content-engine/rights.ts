import type {
  ContentProjectEnvelope,
  OriginalContributionScore,
  PermissionType,
  RightsGateResult,
} from './types.js';

const BLOCKED_PERMISSIONS: PermissionType[] = ['unknown'];

export function evaluateRightsGate(envelope: ContentProjectEnvelope): RightsGateResult {
  const reasons: string[] = [];
  const blockedCodes: string[] = [];

  if (envelope.assets.length === 0) {
    blockedCodes.push('missing_provenance');
    reasons.push('No assets registered');
  }

  for (const asset of envelope.assets) {
    const permission = asset.provenance?.permissionType ?? 'unknown';
    if (!asset.provenance) {
      blockedCodes.push('missing_provenance');
      reasons.push(`Asset ${asset.id} has no provenance`);
    }
    if (BLOCKED_PERMISSIONS.includes(permission)) {
      blockedCodes.push('unknown');
      reasons.push(`Asset ${asset.id} permission is unknown`);
    }
    if (envelope.project.mode === 'repurpose' && permission !== 'owned' && permission !== 'client_authorized') {
      blockedCodes.push('missing_client_authorization');
      reasons.push(`Repurpose asset ${asset.id} lacks client authorization`);
    }
  }

  if (envelope.project.mode === 'commentary') {
    const contribution = envelope.contribution;
    if (!contribution || contribution.score < 40) {
      blockedCodes.push('commentary_without_original_contribution');
      reasons.push('Commentary lacks a sufficient original contribution score');
    }
  }

  const uniqueCodes = [...new Set(blockedCodes)];
  if (uniqueCodes.includes('unknown') || uniqueCodes.includes('missing_provenance')) {
    return { verdict: 'BLOCKED', reasons, blockedCodes: uniqueCodes };
  }
  if (uniqueCodes.length > 0) {
    return { verdict: 'REVIEW_REQUIRED', reasons, blockedCodes: uniqueCodes };
  }
  if (envelope.project.mode === 'commentary') {
    return {
      verdict: 'REVIEW_REQUIRED',
      reasons: [...reasons, 'Commentary always requires human rights review'],
      blockedCodes: [],
    };
  }
  return { verdict: 'LOW_RISK', reasons: reasons.length ? reasons : ['Owned or authorized source with provenance'], blockedCodes: [] };
}

export function canMarkReadyToPublish(result: RightsGateResult, approved: boolean): boolean {
  return approved && result.verdict !== 'BLOCKED';
}

export function scoreOriginalContribution(input: {
  sourceDuration: number;
  originalDuration: number;
  originalNarrationDuration: number;
  numberOfInterruptions: number;
  researchSections: number;
  originalVisualSections: number;
  experimentSections: number;
  conclusionPresent: boolean;
}): OriginalContributionScore {
  const ratio = input.sourceDuration > 0 ? input.originalDuration / input.sourceDuration : 1;
  const score = Math.min(
    100,
    Math.round(
      ratio * 25 +
        Math.min(input.originalNarrationDuration, 40) +
        input.researchSections * 8 +
        input.originalVisualSections * 8 +
        input.experimentSections * 10 +
        (input.conclusionPresent ? 12 : 0) +
        Math.min(input.numberOfInterruptions, 6) * 2
    )
  );
  return {
    ...input,
    score,
    reasons: [
      `Original/source duration ratio ${ratio.toFixed(2)}`,
      `${input.researchSections} research sections`,
      input.conclusionPresent ? 'Conclusion present' : 'Missing conclusion',
    ],
  };
}
