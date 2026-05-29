import type { TenantConfig } from '../../../packages/opsly-core/src/types/index.js';

/** Shadow mode — validates intents without dispatching to production workflows. */
export const peskidsTenantConfig: TenantConfig = {
  slug: 'peskids',
  displayName: 'Peskids',
  mode: 'shadow',
  allowedIntents: ['REPORT_ABSENCE'],
  intentKeywords: {
    REPORT_ABSENCE: ['report absence', 'absent', 'ausencia', 'falta'],
  },
  intents: {
    REPORT_ABSENCE: {
      name: 'REPORT_ABSENCE',
      description: 'Report a student absence to staff workflows',
      workflow: { kind: 'n8n', ref: 'peskids-report-absence' },
      payloadSchema: {
        studentId: 'string',
        date: 'string',
        reason: 'string',
      },
    },
  },
};
