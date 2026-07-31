export type AcademyModules = {
  auth: boolean;
  crm: 'twenty' | false;
  franchises: boolean;
  classes: boolean;
  families: boolean;
  teachers: boolean;
  automation: 'n8n' | false;
  messaging: 'manual_then_wacrm' | 'wacrm' | 'disabled' | false;
  payments: 'disabled' | 'wompi' | false;
  analytics: boolean;
};

export type FranchiseInput = {
  primarySlug: string;
  primaryDisplayName?: string;
  mobileSlug?: string;
  mobileDisplayName?: string;
};

export type TenantInput = {
  slug: string;
  displayName: string;
  domain: string;
  ownerEmail?: string;
  locale?: string;
  timezone?: string;
  franchises?: FranchiseInput | null;
  moduleOverrides?: Partial<AcademyModules>;
  modulesEnabled?: string[];
  platformDomain?: string;
  bundle?: string;
};

export type BlueprintDefaults = {
  defaults: { locale: string; timezone: string; [key: string]: unknown };
  modules: AcademyModules;
  [key: string]: unknown;
};

export type AcademyInstance = {
  tenant: {
    slug: string;
    business_type: 'academy';
    owner_platform: 'icso';
    canonical_domain: string;
    locale: string;
    timezone: string;
    display_name: string;
  };
  modules: AcademyModules;
  policies: {
    ghl_runtime: 'disabled';
    whatsapp_outbound: 'approval_first' | 'disabled';
    payments_live: 'disabled_by_default';
  };
  franchises:
    | { enabled: false }
    | {
        enabled: true;
        primary: { slug: string; type: 'flagship'; is_primary: true };
        owned_mobile?: { slug: string; type: 'mobile' };
      };
};

export type TenantConfig = {
  tenant_name: string;
  tenant_slug: string;
  schema_name: string;
  platform_domain: string;
  public_url: string;
  internal_port: number;
  stack_type: string;
  owner_email?: string;
  vertical: 'academy';
  modules_enabled: string[];
  bundle: string;
  pricing_per_unit: number;
  currency: string;
  notes: string;
};

export type SeedFiles = {
  'tenant-settings.json': { tenant: Record<string, unknown> };
  'roles.json': Record<string, unknown>;
  'franchise-defaults.json'?: { tenant_slug: string; franchises: Record<string, unknown>[] };
};

export type SeedTemplates = {
  blueprintDefaults: BlueprintDefaults;
  roles: Record<string, unknown>;
};

export type ModuleCatalogEntry = {
  name: string;
  bootstrap_script?: string | null;
  smoke_script?: string | null;
  manual_steps?: string[];
  estimated_setup_minutes?: number;
};

export type ModuleCatalog = { modules: Record<string, ModuleCatalogEntry> };

export type ChecklistStep = {
  module: string;
  bootstrap: string | null;
  smoke: string | null;
  manual_steps: string[];
  estimated_setup_minutes: number;
};

export type NextStepsChecklist = { steps: ChecklistStep[]; totalMinutes: number };

export function validateSlug(slug: string | undefined): string | null;
export function buildAcademyInstance(
  input: TenantInput,
  blueprintDefaults: BlueprintDefaults
): AcademyInstance;
export function validateAcademyInstance(instance: Partial<AcademyInstance>): string[];
export function pickNextPort(existingPorts: number[], basePort?: number): number;
export function buildTenantConfig(input: TenantInput, existingPorts: number[]): TenantConfig;
export function validateTenantConfig(config: Partial<TenantConfig>): string[];
export function buildSeedFiles(input: TenantInput, seedTemplates: SeedTemplates): SeedFiles;
export function buildNextStepsChecklist(
  input: { slug: string; ownerEmail?: string; modulesEnabled?: string[] },
  moduleCatalog: ModuleCatalog
): NextStepsChecklist;
