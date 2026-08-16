import { TenantAdaptationSchema } from './schemas.js';
import type { TenantAdaptation } from './types.js';

export const TENANT_ADAPTATIONS: TenantAdaptation[] = [
  TenantAdaptationSchema.parse({
    tenant: 'peskids',
    brandFrame:
      'Stories may occur inside Splashitos/Peskids settings. Global character canon does not change. Orion remains the sports mentor; Kai remains the curiosity engine.',
    preferredCharacterIds: ['orion', 'kai'],
    topicOverrides: {
      swimming: ['orion', 'kai'],
      float: ['orion', 'kai'],
      floating: ['orion', 'kai'],
      flotamos: ['orion', 'kai'],
      sport: ['orion', 'kai'],
    },
    defaultWorldId: 'move',
    allowedWorldIds: ['move', 'earth', 'wild', 'lab', 'nexus'],
    notes: [
      'Peskids is a tenant adaptation, not a fork of canon.',
      'Wavo may appear as play companion, never as replacement coach.',
    ],
    mutatesCanon: false,
  }),
  TenantAdaptationSchema.parse({
    tenant: 'opsly-universe',
    brandFrame: 'Default Opsly Universe frame. No tenant overlay.',
    preferredCharacterIds: ['traveler', 'nova', 'echo'],
    topicOverrides: {},
    defaultWorldId: 'nexus',
    allowedWorldIds: [
      'nexus',
      'earth',
      'mind',
      'future',
      'wild',
      'move',
      'lab',
      'origins',
      'unknown',
    ],
    notes: ['Global canon applies unchanged.'],
    mutatesCanon: false,
  }),
];

export function getTenantAdaptation(tenant?: string): TenantAdaptation | null {
  if (!tenant) return null;
  const key = tenant.trim().toLowerCase();
  return TENANT_ADAPTATIONS.find((item) => item.tenant === key) ?? null;
}

export function cloneCharacterForTenant<T>(value: T): T {
  return structuredClone(value);
}
