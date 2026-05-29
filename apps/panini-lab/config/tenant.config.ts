import type { TenantConfig } from '../../../packages/opsly-core/src/types/index.js';

export const paniniLabTenantConfig: TenantConfig = {
  slug: 'panini-lab',
  displayName: 'Panini Lab',
  mode: 'demo',
  allowedIntents: ['UPDATE_COLLECTION'],
  intentKeywords: {
    UPDATE_COLLECTION: [
      'update collection',
      'album',
      'stickers',
      'colección',
      'figurita',
      'tengo la',
      'repetida',
      'colombia',
    ],
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
