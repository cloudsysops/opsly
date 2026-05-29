import type { TenantConfig } from '../../src/types/index.js';

export const paniniLabTenantConfig: TenantConfig = {
  slug: 'panini-lab',
  displayName: 'Panini Lab',
  mode: 'demo',
  allowedIntents: ['UPDATE_COLLECTION'],
  intentKeywords: {
    UPDATE_COLLECTION: ['update collection', 'album', 'stickers', 'colección'],
  },
  intents: {
    UPDATE_COLLECTION: {
      name: 'UPDATE_COLLECTION',
      description: 'Update a Panini sticker collection catalog entry',
      workflow: { kind: 'n8n', ref: 'panini-update-collection' },
      payloadSchema: {
        collectionId: 'string',
        status: 'string',
      },
    },
  },
};

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

/** Mirrors apps tenant.config.ts files for type-check and tests. Keep in sync manually. */
export const demoTenantConfigs = [
  paniniLabTenantConfig,
  peskidsTenantConfig,
  smileTripCareTenantConfig,
] as const;
