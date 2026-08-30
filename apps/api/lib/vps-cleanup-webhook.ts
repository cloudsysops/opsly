import { z } from 'zod';

export const VPS_CLEANUP_SAFE_ACTIONS = [
  'logs',
  'images',
  'stopped_containers',
  'unused_networks',
] as const;

export const VPS_CLEANUP_RISKY_ACTIONS = ['volumes'] as const;

export const vpsCleanupWebhookSchema = z.object({
  source: z.enum(['discord', 'n8n', 'monitor', 'system']),
  alert_type: z.literal('vps_cleanup_request'),
  severity: z.enum(['info', 'warning', 'critical']),
  vps: z.string().min(1),
  service: z.string().min(1),
  tenant_slug: z
    .string()
    .regex(/^[a-z0-9-]{3,64}$/)
    .nullable()
    .optional(),
  message: z.string().min(1),
  timestamp: z.string().datetime(),
  requested_cleanup: z
    .array(z.enum(['logs', 'images', 'stopped_containers', 'unused_networks', 'volumes']))
    .default([...VPS_CLEANUP_SAFE_ACTIONS]),
  signals: z
    .object({
      disk_usage_pct: z.number().min(0).max(100).optional(),
      orphan_images: z.number().int().min(0).optional(),
      stopped_containers: z.number().int().min(0).optional(),
      unused_networks: z.number().int().min(0).optional(),
      orphan_volumes: z.number().int().min(0).optional(),
    })
    .partial()
    .optional(),
  runbook_ref: z.string().nullable().optional(),
});

export type VpsCleanupWebhookEvent = z.infer<typeof vpsCleanupWebhookSchema>;

export type VpsCleanupDecision = 'safe-auto' | 'approval-required' | 'observe-only';

export interface VpsCleanupSuggestion {
  label: string;
  command: string;
  reversible: boolean;
}

export interface VpsCleanupEvaluation {
  decision: VpsCleanupDecision;
  approval_required: boolean;
  safe_actions: Array<(typeof VPS_CLEANUP_SAFE_ACTIONS)[number]>;
  risky_actions: Array<(typeof VPS_CLEANUP_RISKY_ACTIONS)[number]>;
  suggestions: VpsCleanupSuggestion[];
  rationale: string[];
}

function selectSafeActions(
  actions: readonly string[]
): Array<(typeof VPS_CLEANUP_SAFE_ACTIONS)[number]> {
  return actions.filter((action): action is (typeof VPS_CLEANUP_SAFE_ACTIONS)[number] =>
    VPS_CLEANUP_SAFE_ACTIONS.includes(action as never)
  );
}

function buildSuggestions(
  actions: Array<(typeof VPS_CLEANUP_SAFE_ACTIONS)[number]>
): VpsCleanupSuggestion[] {
  const suggestions: VpsCleanupSuggestion[] = [];
  if (actions.includes('logs')) {
    suggestions.push({
      label: 'Rotate old logs',
      command: "find /opt/opsly/runtime/logs -type f -name '*.log' -mtime +7 -delete",
      reversible: false,
    });
  }
  if (actions.includes('images')) {
    suggestions.push({
      label: 'Prune unused images',
      command: 'docker image prune -af',
      reversible: true,
    });
  }
  if (actions.includes('stopped_containers')) {
    suggestions.push({
      label: 'Remove stopped containers',
      command: 'docker container prune -f',
      reversible: true,
    });
  }
  if (actions.includes('unused_networks')) {
    suggestions.push({
      label: 'Prune unused networks',
      command: 'docker network prune -f',
      reversible: true,
    });
  }
  return suggestions;
}

export function evaluateVpsCleanupEvent(event: VpsCleanupWebhookEvent): VpsCleanupEvaluation {
  const safeActions = selectSafeActions(event.requested_cleanup);
  const riskyActions = event.requested_cleanup.filter(
    (action): action is (typeof VPS_CLEANUP_RISKY_ACTIONS)[number] =>
      VPS_CLEANUP_RISKY_ACTIONS.includes(action as never)
  );

  const rationale: string[] = [];
  if (event.severity === 'critical') {
    rationale.push('critical severity always requires approval');
  }
  if (event.tenant_slug) {
    rationale.push('tenant-scoped events require approval');
  }
  if (riskyActions.length > 0) {
    rationale.push(`risky actions requested: ${riskyActions.join(', ')}`);
  }
  if (safeActions.length === 0) {
    rationale.push('no safe cleanup actions requested');
  }

  const approvalRequired =
    event.severity === 'critical' || Boolean(event.tenant_slug) || riskyActions.length > 0;
  const decision: VpsCleanupDecision = approvalRequired
    ? 'approval-required'
    : safeActions.length > 0
      ? 'safe-auto'
      : 'observe-only';

  if (decision === 'safe-auto') {
    rationale.push('only reversible host-level cleanup requested');
  } else if (decision === 'observe-only') {
    rationale.push('nothing safe to execute automatically');
  }

  return {
    decision,
    approval_required: approvalRequired,
    safe_actions: safeActions,
    risky_actions: riskyActions,
    suggestions: buildSuggestions(safeActions),
    rationale,
  };
}

export function cleanupWebhookSecret(): string | null {
  const secret = process.env.OPSLY_VPS_CLEANUP_WEBHOOK_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
}
