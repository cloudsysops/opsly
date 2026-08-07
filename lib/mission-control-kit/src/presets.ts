import type { MissionControlBrand, MissionControlNavSection, MissionControlProfile } from './types.js';
import { parseMissionControlProfile } from './profile.js';

const defaultAgencyBrand: MissionControlBrand = {
  productName: 'ICSO Mission Control',
  shortName: 'ICSO MC',
  tagline: 'SEE. AUTOMATE. GROW.',
  colors: {
    background: '#0A0A0A',
    surface: '#111827',
    primary: '#2563EB',
    accent: '#8B5CF6',
    success: '#22C55E',
    warning: '#F59E0B',
    critical: '#EF4444',
    text: '#F3F4F6',
    muted: '#9CA3AF',
  },
};

export function buildAgencyNav(basePath: string): MissionControlNavSection[] {
  return [
    {
      title: 'Agency',
      items: [
        { href: basePath, label: 'Inicio' },
        { href: `${basePath}/pipeline`, label: 'Pipeline' },
        { href: `${basePath}/catalog`, label: 'Catálogo' },
        { href: `${basePath}/modules`, label: 'Módulos Opsly' },
      ],
    },
    {
      title: 'Operaciones',
      items: [
        { href: `${basePath}/integrations`, label: 'Integraciones' },
        { href: `${basePath}/health`, label: 'Health' },
      ],
    },
    {
      title: 'Sistema',
      items: [
        { href: `${basePath}/command`, label: 'Command' },
        { href: '/', label: 'Sitio público' },
      ],
    },
  ];
}

export function buildTenantNav(basePath: string): MissionControlNavSection[] {
  return [
    {
      title: 'Negocio',
      items: [
        { href: basePath, label: 'Inicio' },
        { href: `${basePath}/pipeline`, label: 'Pipeline' },
        { href: `${basePath}/automations`, label: 'Automatizaciones' },
      ],
    },
    {
      title: 'Operaciones',
      items: [
        { href: `${basePath}/integrations`, label: 'Integraciones' },
        { href: `${basePath}/health`, label: 'Health' },
        { href: `${basePath}/support`, label: 'Soporte' },
      ],
    },
  ];
}

/** First-party ICSO agency Mission Control profile. */
export function createIcsoAgencyProfile(
  overrides: Partial<MissionControlProfile> = {}
): MissionControlProfile {
  const basePath = overrides.basePath ?? '/mission-control';
  const raw = {
    id: 'icso',
    mode: 'agency' as const,
    tenantSlug: 'intcloudsysops',
    brand: defaultAgencyBrand,
    basePath,
    nav: buildAgencyNav(basePath),
    features: {
      pipeline: true,
      catalog: true,
      modules: true,
      integrations: true,
      usage: false,
      command: true,
    },
    publicPanelUrl: null,
    docsPath: 'docs/00-architecture/MISSION-CONTROL-KIT.md',
    dataBoundaries: [
      'peskids-leads',
      'peskids-students',
      'peskids-families',
      'platform-tenants-pii',
    ],
    ...overrides,
  };
  return parseMissionControlProfile(raw);
}

/**
 * Scaffold a tenant Mission Control profile for a new client.
 * Domain data (leads schema, etc.) stays in apps/<tenant>; kit only defines shell contract.
 */
export function createTenantMissionControlProfile(input: {
  tenantSlug: string;
  productName: string;
  shortName: string;
  basePath?: string;
  publicPanelUrl?: string | null;
  brandColors?: Partial<MissionControlBrand['colors']>;
}): MissionControlProfile {
  const basePath = input.basePath ?? '/admin';
  const colors: MissionControlBrand['colors'] = {
    ...defaultAgencyBrand.colors,
    ...input.brandColors,
  };
  return parseMissionControlProfile({
    id: input.tenantSlug,
    mode: 'tenant',
    tenantSlug: input.tenantSlug,
    brand: {
      productName: input.productName,
      shortName: input.shortName,
      colors,
    },
    basePath,
    nav: buildTenantNav(basePath),
    features: {
      pipeline: true,
      catalog: false,
      modules: false,
      integrations: true,
      usage: true,
      command: false,
    },
    publicPanelUrl: input.publicPanelUrl ?? null,
    docsPath: 'docs/runbooks/MISSION-CONTROL-TENANT-ROLLOUT.md',
    dataBoundaries: ['platform-admin', 'other-tenants', 'opsly-moon'],
  });
}
