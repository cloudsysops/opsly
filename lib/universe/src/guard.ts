export type UniverseGuardReason =
  | 'open_child_dms'
  | 'unrestricted_child_chat'
  | 'behavioral_advertising'
  | 'public_child_identity'
  | 'publish_without_consent'
  | 'hardcode_canon_into_consumer'
  | 'duplicate_canon';

export interface UniverseChangeProposal {
  openChildDms?: boolean;
  unrestrictedChildChat?: boolean;
  behavioralAdvertising?: boolean;
  publicChildIdentity?: boolean;
  publishWithoutConsent?: boolean;
  hardcodeCanonIntoConsumer?: boolean;
  duplicateCanon?: boolean;
}

export interface UniverseGuardResult {
  allowed: boolean;
  blocked: UniverseGuardReason[];
  reasons: string[];
}

const REASON_MESSAGES: Record<UniverseGuardReason, string> = {
  open_child_dms: 'No open child DMs.',
  unrestricted_child_chat: 'No unrestricted text or voice chat with minors.',
  behavioral_advertising: 'No behavioral advertising to child profiles.',
  public_child_identity: 'No public real identities by default for child explorers.',
  publish_without_consent: 'No automatic publishing without adult-approved consent.',
  hardcode_canon_into_consumer: 'No hardcoding tenant-specific canon into shared universe modules.',
  duplicate_canon: 'No parallel canon; reuse the canonical universe package.',
};

export function evaluateUniverseChangeGuard(
  proposal: UniverseChangeProposal,
): UniverseGuardResult {
  const blocked: UniverseGuardReason[] = [];
  if (proposal.openChildDms) blocked.push('open_child_dms');
  if (proposal.unrestrictedChildChat) blocked.push('unrestricted_child_chat');
  if (proposal.behavioralAdvertising) blocked.push('behavioral_advertising');
  if (proposal.publicChildIdentity) blocked.push('public_child_identity');
  if (proposal.publishWithoutConsent) blocked.push('publish_without_consent');
  if (proposal.hardcodeCanonIntoConsumer) blocked.push('hardcode_canon_into_consumer');
  if (proposal.duplicateCanon) blocked.push('duplicate_canon');

  return {
    allowed: blocked.length === 0,
    blocked,
    reasons: blocked.map((reason) => REASON_MESSAGES[reason]),
  };
}

export function isUniverseChangeAllowed(proposal: UniverseChangeProposal): boolean {
  return evaluateUniverseChangeGuard(proposal).allowed;
}
