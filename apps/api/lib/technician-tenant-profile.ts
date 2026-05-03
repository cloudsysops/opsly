import type { Json } from './supabase/types';

export type TechnicianServicePreset = {
  readonly external_key: string;
  readonly name: string;
  readonly description: string;
  readonly price_cents: number;
  readonly duration_minutes: number;
};

export type TechnicianTenantMetadata = {
  readonly local_services_profile: 'technician';
  readonly technician: {
    readonly type: 'technician';
    readonly services: readonly TechnicianServicePreset[];
    readonly availability: {
      readonly weekdays: {
        readonly start: string;
        readonly end: string;
        readonly days: readonly string[];
      };
      readonly weekends: {
        readonly start: string;
        readonly end: string;
        readonly days: readonly string[];
      };
    };
    readonly service_area: {
      readonly states: readonly string[];
      readonly initial_focus: string;
      readonly travel_radius_miles: number;
      readonly travel_fee_cents: number;
    };
  };
};

/** CloudSysOps field-service preset (RI / southern New England focus). */
export const CLOUDSYSOPS_TECHNICIAN_METADATA: TechnicianTenantMetadata = {
  local_services_profile: 'technician',
  technician: {
    type: 'technician',
    services: [
      {
        external_key: 'pc-cleanup',
        name: 'PC/Laptop Cleanup',
        description: 'Tune-up, temp files, startup, security basics.',
        price_cents: 14900,
        duration_minutes: 90,
      },
      {
        external_key: 'gaming-optimization',
        name: 'Gaming PC Optimization',
        description: 'Drivers, power plan, thermal and game-ready tweaks.',
        price_cents: 19900,
        duration_minutes: 120,
      },
      {
        external_key: 'office-support',
        name: 'Office IT Support',
        description: 'Workstation, printer, Wi‑Fi, and productivity stack.',
        price_cents: 29900,
        duration_minutes: 120,
      },
    ],
    availability: {
      weekdays: { start: '18:00', end: '21:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
      weekends: { start: '10:00', end: '18:00', days: ['Sat', 'Sun'] },
    },
    service_area: {
      states: ['RI', 'MA', 'CT'],
      initial_focus: 'RI',
      travel_radius_miles: 30,
      travel_fee_cents: 2500,
    },
  },
};

export function isTechnicianTenantMetadata(metadata: Json): boolean {
  if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return false;
  }
  const rec = metadata as Record<string, unknown>;
  if (rec.local_services_profile === 'technician') {
    return true;
  }
  const tech = rec.technician;
  if (tech !== null && typeof tech === 'object' && !Array.isArray(tech)) {
    return (tech as Record<string, unknown>).type === 'technician';
  }
  return false;
}

export function technicianMetadataAsJson(): Json {
  return CLOUDSYSOPS_TECHNICIAN_METADATA as unknown as Json;
}

export function technicianAllowedStatesFromMetadata(metadata: Json): readonly string[] {
  if (!isTechnicianTenantMetadata(metadata)) {
    return [];
  }
  const rec = metadata as Record<string, unknown>;
  const tech = rec.technician;
  if (tech !== null && typeof tech === 'object' && !Array.isArray(tech)) {
    const area = (tech as Record<string, unknown>).service_area;
    if (area !== null && typeof area === 'object' && !Array.isArray(area)) {
      const states = (area as Record<string, unknown>).states;
      if (Array.isArray(states) && states.every((s) => typeof s === 'string')) {
        return states as string[];
      }
    }
  }
  return CLOUDSYSOPS_TECHNICIAN_METADATA.technician.service_area.states;
}
