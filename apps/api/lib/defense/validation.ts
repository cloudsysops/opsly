import { z } from 'zod';

export const DEFENSE_AUDIT_TYPES = z.enum(['security', 'compliance', 'pentest', 'code_review']);

export const createDefenseAuditBodySchema = z.object({
  tenant_id: z.string().uuid(),
  audit_type: DEFENSE_AUDIT_TYPES,
  framework: z.string().min(1).max(64).optional(),
  scope: z.array(z.string().min(1).max(64)).max(32).optional(),
});

export type CreateDefenseAuditBody = z.infer<typeof createDefenseAuditBodySchema>;

export const remediateVulnerabilityBodySchema = z.object({
  remediation_evidence: z.string().max(16_000).optional(),
  notes: z.string().max(8000).optional(),
});

export type RemediateVulnerabilityBody = z.infer<typeof remediateVulnerabilityBodySchema>;
