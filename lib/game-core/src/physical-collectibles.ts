export const physicalObjectCategoryValues = [
  'CONSOLE',
  'CONTROLLER',
  'GAME_MEDIA',
  'COMPUTER',
  'RASPBERRY_PI',
  'NETWORK_DEVICE',
  'ELECTRONICS',
  'SENSOR',
  'ROBOTICS',
  'BOOK',
  'TOOL',
  'CUSTOM_BUILD',
  'OTHER',
] as const;

export type PhysicalObjectCategory = (typeof physicalObjectCategoryValues)[number];

export const captureStatusValues = [
  'UPLOADED',
  'ANALYSIS_PENDING',
  'CANDIDATE',
  'NEEDS_USER_CONFIRMATION',
  'APPROVED',
  'REJECTED',
] as const;

export type CaptureStatus = (typeof captureStatusValues)[number];

export interface PhysicalCollectibleCandidate {
  id: string;
  playerId: string;
  assetRef: string;
  category: PhysicalObjectCategory;
  userLabel?: string;
  suggestedLabel?: string;
  confidence?: number;
  status: CaptureStatus;
  createdAt: string;
  privacy: {
    exifStripped: boolean;
    locationStored: false;
    faceDetectionAction: 'NOT_RUN' | 'REVIEW' | 'REJECT_OR_CROP';
  };
  provenance: {
    submittedByPlayer: true;
    ownershipClaimed: boolean;
    verifiedOwnership: false;
  };
  unlockCandidates: string[];
}

export interface PhysicalCollectible {
  id: string;
  playerId: string;
  assetRef: string;
  category: PhysicalObjectCategory;
  label: string;
  acquiredAt: string;
  linkedMissionIds: string[];
  museumTags: string[];
}

export interface CaptureAnalysisProposal {
  suggestedLabel: string;
  category: PhysicalObjectCategory;
  confidence: number;
  unlockCandidates: string[];
}

/**
 * Game Core accepts only sanitized metadata + an opaque assetRef.
 * Raw camera bytes and computer-vision execution belong at the app/media edge.
 */
export function createCollectibleCandidate(input: {
  id: string;
  playerId: string;
  assetRef: string;
  category: PhysicalObjectCategory;
  userLabel?: string;
  ownershipClaimed: boolean;
  createdAt: string;
}): PhysicalCollectibleCandidate {
  if (!input.assetRef.trim()) throw new Error('ASSET_REF_REQUIRED');
  return {
    id: input.id,
    playerId: input.playerId,
    assetRef: input.assetRef,
    category: input.category,
    userLabel: input.userLabel?.trim() || undefined,
    status: 'UPLOADED',
    createdAt: input.createdAt,
    privacy: {
      exifStripped: true,
      locationStored: false,
      faceDetectionAction: 'NOT_RUN',
    },
    provenance: {
      submittedByPlayer: true,
      ownershipClaimed: input.ownershipClaimed,
      verifiedOwnership: false,
    },
    unlockCandidates: [],
  };
}

export function applyCaptureAnalysis(
  candidate: PhysicalCollectibleCandidate,
  proposal: CaptureAnalysisProposal,
): PhysicalCollectibleCandidate {
  if (proposal.confidence < 0 || proposal.confidence > 1) {
    throw new Error('INVALID_CAPTURE_CONFIDENCE');
  }
  return {
    ...candidate,
    category: proposal.category,
    suggestedLabel: proposal.suggestedLabel,
    confidence: proposal.confidence,
    unlockCandidates: [...new Set(proposal.unlockCandidates)],
    status: proposal.confidence >= 0.85 ? 'CANDIDATE' : 'NEEDS_USER_CONFIRMATION',
  };
}

export function approvePhysicalCollectible(
  candidate: PhysicalCollectibleCandidate,
  confirmedLabel: string,
  linkedMissionIds: string[],
  museumTags: string[],
): PhysicalCollectible {
  if (!confirmedLabel.trim()) throw new Error('COLLECTIBLE_LABEL_REQUIRED');
  if (!['CANDIDATE', 'NEEDS_USER_CONFIRMATION'].includes(candidate.status)) {
    throw new Error('COLLECTIBLE_NOT_REVIEWABLE');
  }
  return {
    id: candidate.id,
    playerId: candidate.playerId,
    assetRef: candidate.assetRef,
    category: candidate.category,
    label: confirmedLabel.trim(),
    acquiredAt: candidate.createdAt,
    linkedMissionIds: [...new Set(linkedMissionIds)],
    museumTags: [...new Set(museumTags)],
  };
}

export const PHYSICAL_CAPTURE_RULES = [
  'Strip EXIF metadata before analysis or storage.',
  'Do not store GPS location from images.',
  'Do not infer or store identity, age, health, ethnicity, religion, or other sensitive traits from a photo.',
  'If a face is prominent, require crop/review before the object becomes a collectible.',
  'Computer vision proposes labels; the player or guardian confirms them.',
  'A photo does not prove ownership or authenticity.',
  'Do not accept weapon, explicit, or illegal-item collectibles.',
] as const;
