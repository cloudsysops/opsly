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

export function getCatalogVertical(id: string): CatalogVertical | undefined {
  return commercialCatalog.verticals.find((vertical) => vertical.id === id);
}

export function packagesIncludingModule(moduleId: string): CatalogPackage[] {
  return commercialCatalog.packages.filter((pkg) => pkg.module_ids.includes(moduleId));
}

export interface PackageSow {
  packageId: string;
  packageName: string;
  packageNameEs: string;
  verticalLabel: string | null;
  setupPrice: string;
  opsPrice: string;
  modules: CatalogModule[];
  includes: string[];
  excludes: string[];
  pitch: string;
  disclaimer: string;
  plainText: string;
}

/** One-page SOW text for sales calls / copy-paste. */
export function buildPackageSow(
  packageId: string,
  verticalId?: string | null
): PackageSow | null {
  const pkg = getCatalogPackage(packageId);
  if (!pkg) {
    return null;
  }
  const vertical = verticalId ? getCatalogVertical(verticalId) : undefined;
  const modules = modulesForPackage(pkg);
  const lines = [
    `ICSO / Opsly — SOW orientativo`,
    `Paquete: ${pkg.name} (${pkg.name_es})`,
    vertical ? `Vertical: ${vertical.label}` : null,
    `Setup: ${formatSetupPrice(pkg)}`,
    `Ops mensual: ${formatOpsPrice(pkg)}`,
    '',
    'Módulos incluidos:',
    ...modules.map((mod) => `- ${mod.label} (${mod.label_es}): ${mod.summary}`),
    '',
    'Incluye:',
    ...pkg.includes.map((item) => `- ${item}`),
    '',
    'No incluye:',
    ...pkg.excludes.map((item) => `- ${item}`),
    '',
    commercialCatalog.sales_pitch_es,
    '',
    commercialCatalog.disclaimer,
  ].filter((line): line is string => line !== null);

  return {
    packageId: pkg.id,
    packageName: pkg.name,
    packageNameEs: pkg.name_es,
    verticalLabel: vertical?.label ?? null,
    setupPrice: formatSetupPrice(pkg),
    opsPrice: formatOpsPrice(pkg),
    modules,
    includes: pkg.includes,
    excludes: pkg.excludes,
    pitch: commercialCatalog.sales_pitch_es,
    disclaimer: commercialCatalog.disclaimer,
    plainText: lines.join('\n'),
  };
}

/** Prefill copy for contact form / mailto (Spanish sales brief). */
export function buildPackageInquiryMessage(
  packageId: string | null | undefined,
  verticalId: string | null | undefined,
  moduleId?: string | null
): string {
  const parts: string[] = [];
  const pkg = packageId ? getCatalogPackage(packageId) : undefined;
  const vertical = verticalId ? getCatalogVertical(verticalId) : undefined;
  const mod = moduleId ? getCatalogModule(moduleId) : undefined;

  if (pkg) {
    parts.push(`Interested in package: ${pkg.name} (${pkg.id}).`);
    parts.push(`Setup guidance: ${formatSetupPrice(pkg)} · ops ${formatOpsPrice(pkg)}.`);
  }
  if (vertical) {
    parts.push(`Vertical: ${vertical.label} (${vertical.id}).`);
  }
  if (mod) {
    parts.push(`Module focus: ${mod.label} (${mod.id}) — ${mod.summary}`);
  }
  if (parts.length === 0) {
    return '';
  }
  parts.push('');
  parts.push(commercialCatalog.sales_pitch_es);
  parts.push('');
  parts.push('Context / bottleneck:');
  return `${parts.join('\n')} `;
}

export function buildDiscoveryMailto(options: {
  to: string;
  packageId?: string | null;
  verticalId?: string | null;
  moduleId?: string | null;
}): string {
  const pkg = options.packageId ? getCatalogPackage(options.packageId) : undefined;
  const vertical = options.verticalId ? getCatalogVertical(options.verticalId) : undefined;
  const mod = options.moduleId ? getCatalogModule(options.moduleId) : undefined;
  const subjectParts = ['ICSO discovery'];
  if (pkg) {
    subjectParts.push(pkg.name);
  }
  if (vertical) {
    subjectParts.push(vertical.label);
  }
  if (mod) {
    subjectParts.push(mod.label);
  }
  const subject = subjectParts.join(' — ');
  const body = buildPackageInquiryMessage(
    options.packageId,
    options.verticalId,
    options.moduleId
  );
  const params = new URLSearchParams({ subject, body });
  return `mailto:${options.to}?${params.toString()}`;
}
