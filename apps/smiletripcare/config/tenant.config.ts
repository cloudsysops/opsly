import type { TenantConfig } from '../../../packages/opsly-core/src/types/index.js';

/** Shadow mode — lead capture validated without touching live CRM automations. */
export const smileTripCareTenantConfig: TenantConfig = {
  slug: 'smiletripcare',
  displayName: 'SmileTripCare',
  mode: 'shadow',
  allowedIntents: ['CREATE_LEAD'],
  intentKeywords: {
    CREATE_LEAD: ['create lead', 'new lead', 'interested', 'contact me', 'lead'],
  },
  intents: {
    CREATE_LEAD: {
      name: 'CREATE_LEAD',
      description: 'Capture a dental tourism lead from conversational intake',
      workflow: { kind: 'webhook', ref: 'smiletripcare-create-lead' },
      payloadSchema: {
        email: 'string',
        phone: 'string',
        treatment: 'string',
      },
    },
  },
};
