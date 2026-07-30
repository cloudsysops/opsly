import catalogJson from '@/content/commercial-catalog.json';

export type CatalogRisk = 'low' | 'medium' | 'high';

export type VerticalStatus = 'live' | 'ready' | 'blueprint';

export interface CatalogMoneyRange {
  min: number;
  max: number;
}

export interface CatalogModule {
  id: string;
  label: string;
  label_es: string;
  mvp_default: boolean;
  risk: CatalogRisk;
  summary: string;
}

export interface CatalogPackage {
  id: string;
  name: string;
  name_es: string;
  ideal_for: string;
  setup_range_usd: CatalogMoneyRange | null;
  ops_monthly_usd: CatalogMoneyRange | null;
  highlighted: boolean;
  module_ids: string[];
  includes: string[];
  excludes: string[];
}

export interface CatalogVertical {
  id: string;
  label: string;
  reference_tenant: string | null;
  status: VerticalStatus;
  recommended_package_id: string;
}

export interface CommercialCatalog {
  version: string;
  updated: string;
  owner: string;
  currency: string;
  disclaimer: string;
  sales_pitch_es: string;
  modules: CatalogModule[];
  packages: CatalogPackage[];
  verticals: CatalogVertical[];
}

export const commercialCatalog = catalogJson as CommercialCatalog;

export function getCatalogPackage(id: string): CatalogPackage | undefined {
  return commercialCatalog.packages.find((pkg) => pkg.id === id);
}

export function getCatalogModule(id: string): CatalogModule | undefined {
  return commercialCatalog.modules.find((mod) => mod.id === id);
}

export function formatUsdRange(range: CatalogMoneyRange | null): string {
  if (!range) {
    return 'Custom';
  }
  if (range.min === range.max) {
    return `$${range.min.toLocaleString('en-US')}`;
  }
  return `$${range.min.toLocaleString('en-US')} – $${range.max.toLocaleString('en-US')}`;
}

export function formatSetupPrice(pkg: CatalogPackage): string {
  return formatUsdRange(pkg.setup_range_usd);
}

export function formatOpsPrice(pkg: CatalogPackage): string {
  const formatted = formatUsdRange(pkg.ops_monthly_usd);
  return formatted === 'Custom' ? 'Custom' : `${formatted}/mo`;
}

export function modulesForPackage(pkg: CatalogPackage): CatalogModule[] {
  return pkg.module_ids
    .map((id) => getCatalogModule(id))
    .filter((mod): mod is CatalogModule => mod !== undefined);
}

export function mvpModules(): CatalogModule[] {
  return commercialCatalog.modules.filter((mod) => mod.mvp_default);
}
