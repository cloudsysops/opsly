/**
 * Shared Mission Control types — platform / agency / tenant modes.
 * No React. Consumers (apps/icso, apps/admin Moon, apps/<tenant>) compose UI.
 */

export type MissionControlMode = 'platform' | 'agency' | 'tenant';

/** Financial / metric confidence — never present ESTIMADO as live commercial truth. */
export type DataConfidence = 'REAL' | 'ESTIMADO' | 'PROYECTADO';

export type HealthTone = 'healthy' | 'warning' | 'critical' | 'unknown';

export type MissionControlNavItem = {
  href: string;
  label: string;
  /** Optional legacy path for bookmarks */
  legacyHref?: string;
};

export type MissionControlNavSection = {
  title: string;
  items: MissionControlNavItem[];
};

export type LabeledValue<T> = {
  value: T;
  confidence: DataConfidence;
  source: string;
  omittedReason?: string;
};

export type MissionControlBrand = {
  productName: string;
  shortName: string;
  tagline?: string;
  /** CSS color tokens (hex). Consumers map to Tailwind/CSS vars. */
  colors: {
    background: string;
    surface: string;
    primary: string;
    accent: string;
    success: string;
    warning: string;
    critical: string;
    text: string;
    muted: string;
  };
};

export type MissionControlFeatureFlags = {
  /** Show pipeline / deals for agency or tenant CRM */
  pipeline: boolean;
  /** Commercial catalog / packages */
  catalog: boolean;
  /** Module registry read-only */
  modules: boolean;
  /** Integrations inventory (no secrets) */
  integrations: boolean;
  /** Usage / costs with confidence labels */
  usage: boolean;
  /** Command bar dry-run */
  command: boolean;
};

export type MissionControlProfile = {
  /** Profile id — usually tenant_slug or agency id */
  id: string;
  mode: MissionControlMode;
  tenantSlug: string;
  brand: MissionControlBrand;
  basePath: string;
  nav: MissionControlNavSection[];
  features: MissionControlFeatureFlags;
  /** Public panel URL for "open tenant panel" CTAs */
  publicPanelUrl?: string | null;
  /** Docs path relative to repo */
  docsPath?: string | null;
  /** Forbidden domains of data (e.g. peskids PII in agency MC) */
  dataBoundaries: string[];
};
