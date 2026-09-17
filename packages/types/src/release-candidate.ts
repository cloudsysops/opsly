import { z } from 'zod';

export const releaseGateStateSchema = z.enum(['passed', 'not_required', 'pending', 'failed']);

export const releaseArtifactV1Schema = z.object({
  kind: z.enum(['container_image', 'build_artifact', 'git_sha']),
  name: z.string().min(1),
  immutable_ref: z.string().min(1),
  digest: z.string().min(1).optional(),
});

export const releaseCandidateV1Schema = z
  .object({
    schema_version: z.literal('ReleaseCandidateV1'),
    candidate_id: z.string().min(1),
    product: z.string().min(1),
    tenant_slug: z.string().min(1).optional(),
    commit_sha: z.string().regex(/^[0-9a-f]{40}$/),
    source_environment: z.literal('staging'),
    staging_deployment: z.string().min(1),
    staging_run_id: z.string().min(1),
    artifacts: z.array(releaseArtifactV1Schema).min(1),
    gates: z.object({
      ci: releaseGateStateSchema,
      security: releaseGateStateSchema,
      staging_health: releaseGateStateSchema,
      e2e: releaseGateStateSchema,
      independent_verification: releaseGateStateSchema,
    }),
    migration: z.object({
      plan_ref: z.string().min(1).optional(),
      requires_approval: z.boolean(),
      safe_for_promotion: z.boolean(),
      production_applied: z.literal(false),
    }),
    evidence_refs: z.array(z.string().min(1)).min(1),
    blockers: z.array(z.string().min(1)).default([]),
    status: z.enum(['ready', 'blocked']),
    promotion: z.object({
      target_environment: z.literal('production'),
      rebuild_allowed: z.literal(false),
      exact_commit_required: z.literal(true),
      exact_artifact_required: z.literal(true),
      rollback_ref: z.string().min(1).optional(),
    }),
    created_at: z.string().datetime(),
  })
  .superRefine((candidate, ctx) => {
    if (candidate.status !== 'ready') return;

    if (candidate.blockers.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['blockers'],
        message: 'ready release candidate cannot contain blockers',
      });
    }

    for (const [gate, state] of Object.entries(candidate.gates)) {
      if (state !== 'passed' && state !== 'not_required') {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['gates', gate],
          message: 'ready release candidate requires terminal gate state',
        });
      }
    }

    if (!candidate.migration.safe_for_promotion) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['migration', 'safe_for_promotion'],
        message: 'ready release candidate requires migration-safe promotion',
      });
    }

    if (
      candidate.artifacts.some(
        (artifact) =>
          artifact.kind !== 'git_sha' &&
          !artifact.digest &&
          !artifact.immutable_ref.includes('@sha256:')
      )
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['artifacts'],
        message: 'ready release candidate requires immutable artifact digest',
      });
    }
  });

export type ReleaseGateState = z.infer<typeof releaseGateStateSchema>;
export type ReleaseArtifactV1 = z.infer<typeof releaseArtifactV1Schema>;
export type ReleaseCandidateV1 = z.infer<typeof releaseCandidateV1Schema>;
