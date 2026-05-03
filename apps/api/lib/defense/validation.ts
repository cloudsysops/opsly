import { z } from 'zod';
import { DEFENSE_SCHEMA_LIMITS } from '../constants';

export const DEFENSE_AUDIT_TYPES = z.enum(['security', 'compliance', 'pentest', 'code_review']);

const L = DEFENSE_SCHEMA_LIMITS;

export const createDefenseAuditBodySchema = z.object({
  tenant_id: z.string().uuid(),
  audit_type: DEFENSE_AUDIT_TYPES,
  framework: z.string().min(1).max(L.FRAMEWORK_MAX_LEN).optional(),
  scope: z.array(z.string().min(1).max(L.SCOPE_ITEM_MAX_LEN)).max(L.SCOPE_MAX_ITEMS).optional(),
});

export type CreateDefenseAuditBody = z.infer<typeof createDefenseAuditBodySchema>;

export const remediateVulnerabilityBodySchema = z.object({
  remediation_evidence: z.string().max(L.REMEDIATION_EVIDENCE_MAX).optional(),
  notes: z.string().max(L.REMEDIATION_NOTES_MAX).optional(),
});

export type RemediateVulnerabilityBody = z.infer<typeof remediateVulnerabilityBodySchema>;
