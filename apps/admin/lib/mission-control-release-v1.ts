export type ReleaseGateStateV1 = 'passed' | 'not_required' | 'pending' | 'failed';

export type ReleaseCandidateReadV1 = {
  schema_version: 'ReleaseCandidateV1';
  candidate_id: string;
  commit_sha: string;
  staging_run_id: string;
  status: 'ready' | 'blocked';
  gates: {
    ci: ReleaseGateStateV1;
    security: ReleaseGateStateV1;
    staging_health: ReleaseGateStateV1;
    e2e: ReleaseGateStateV1;
    independent_verification: ReleaseGateStateV1;
  };
  migration: {
    requires_approval: boolean;
    safe_for_promotion: boolean;
    production_applied: false;
  };
  blockers: string[];
  artifacts: Array<{
    name: string;
    immutable_ref: string;
    digest?: string;
  }>;
  promotion: {
    target_environment: 'production';
    rebuild_allowed: false;
    exact_commit_required: true;
    exact_artifact_required: true;
    rollback_ref?: string;
  };
  evidence_refs: string[];
};

export type ReleasePipelineStageIdV1 =
  | 'INTEGRATED'
  | 'QA_DEPLOYED'
  | 'QA_VERIFIED'
  | 'RELEASE_CANDIDATE'
  | 'PROD_APPROVAL_REQUIRED'
  | 'RELEASED'
  | 'ROLLED_BACK';

export type ReleasePipelineStageStateV1 = 'PASSED' | 'PENDING' | 'BLOCKED' | 'UNKNOWN';

export type ReleasePipelineStageV1 = {
  id: ReleasePipelineStageIdV1;
  state: ReleasePipelineStageStateV1;
  detail: string;
};

export type MissionControlReleaseProjectionV1 = {
  schema_version: 'MissionControlReleaseProjectionV1';
  confidence: 'OBSERVED' | 'UNKNOWN';
  candidate_id: string | null;
  commit_sha: string | null;
  stages: ReleasePipelineStageV1[];
  blockers: string[];
  artifacts: ReleaseCandidateReadV1['artifacts'];
  evidence_refs: string[];
};

function gateState(candidate: ReleaseCandidateReadV1): ReleasePipelineStageStateV1 {
  const qa = [candidate.gates.staging_health, candidate.gates.e2e];
  if (qa.includes('failed')) return 'BLOCKED';
  if (qa.every((state) => state === 'passed' || state === 'not_required')) return 'PASSED';
  return 'PENDING';
}

export function buildMissionControlReleaseProjectionV1(
  candidate: ReleaseCandidateReadV1 | null | undefined,
): MissionControlReleaseProjectionV1 {
  if (!candidate) {
    return {
      schema_version: 'MissionControlReleaseProjectionV1',
      confidence: 'UNKNOWN',
      candidate_id: null,
      commit_sha: null,
      stages: [
        { id: 'INTEGRATED', state: 'UNKNOWN', detail: 'No exact release candidate evidence is bound.' },
        { id: 'QA_DEPLOYED', state: 'UNKNOWN', detail: 'No staging deployment evidence is bound.' },
        { id: 'QA_VERIFIED', state: 'UNKNOWN', detail: 'No staging health/E2E evidence is bound.' },
        { id: 'RELEASE_CANDIDATE', state: 'UNKNOWN', detail: 'No ReleaseCandidateV1 is bound.' },
        { id: 'PROD_APPROVAL_REQUIRED', state: 'UNKNOWN', detail: 'Approval state is unknown until a candidate is ready.' },
        { id: 'RELEASED', state: 'UNKNOWN', detail: 'No production promotion evidence is bound.' },
        { id: 'ROLLED_BACK', state: 'UNKNOWN', detail: 'No rollback evidence is bound.' },
      ],
      blockers: ['release_candidate_evidence_unbound'],
      artifacts: [],
      evidence_refs: [],
    };
  }

  const qaState = gateState(candidate);
  const candidateState: ReleasePipelineStageStateV1 =
    candidate.status === 'ready' ? 'PASSED' : 'BLOCKED';
  const approvalState: ReleasePipelineStageStateV1 =
    candidate.status === 'ready' ? 'PENDING' : 'BLOCKED';

  return {
    schema_version: 'MissionControlReleaseProjectionV1',
    confidence: 'OBSERVED',
    candidate_id: candidate.candidate_id,
    commit_sha: candidate.commit_sha,
    stages: [
      { id: 'INTEGRATED', state: 'PASSED', detail: `Exact candidate SHA ${candidate.commit_sha.slice(0, 12)} is bound.` },
      { id: 'QA_DEPLOYED', state: 'PASSED', detail: `Staging run ${candidate.staging_run_id} is bound.` },
      { id: 'QA_VERIFIED', state: qaState, detail: `staging_health=${candidate.gates.staging_health}; e2e=${candidate.gates.e2e}` },
      { id: 'RELEASE_CANDIDATE', state: candidateState, detail: candidate.status === 'ready' ? 'Immutable candidate is ready.' : 'Candidate remains blocked.' },
      { id: 'PROD_APPROVAL_REQUIRED', state: approvalState, detail: candidate.status === 'ready' ? 'Explicit governed production approval is required.' : 'Approval cannot begin while candidate is blocked.' },
      { id: 'RELEASED', state: 'UNKNOWN', detail: 'ReleaseCandidateV1 alone does not prove production promotion.' },
      { id: 'ROLLED_BACK', state: 'UNKNOWN', detail: candidate.promotion.rollback_ref ? `Rollback ref available: ${candidate.promotion.rollback_ref}` : 'No rollback execution evidence is bound.' },
    ],
    blockers: [...candidate.blockers],
    artifacts: [...candidate.artifacts],
    evidence_refs: [...candidate.evidence_refs],
  };
}
