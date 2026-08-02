import { createHash } from 'node:crypto';
import { readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { z } from 'zod';

import { resolveOpslyRepoRoot } from '../tools-execute';

const CATALOG_REL_PATH = 'config/commercial-catalog.json';

const catalogRiskSchema = z.enum(['low', 'medium', 'high']);
const verticalStatusSchema = z.enum(['live', 'ready', 'blueprint']);

const catalogMoneyRangeSchema = z.object({
  min: z.number(),
  max: z.number(),
});

const catalogModuleSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  label_es: z.string().min(1),
  mvp_default: z.boolean(),
  risk: catalogRiskSchema,
  summary: z.string().min(1),
});

const catalogPackageSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  name_es: z.string().min(1),
  ideal_for: z.string().min(1),
  setup_range_usd: catalogMoneyRangeSchema.nullable(),
  ops_monthly_usd: catalogMoneyRangeSchema.nullable(),
  highlighted: z.boolean(),
  module_ids: z.array(z.string().min(1)),
  includes: z.array(z.string()),
  excludes: z.array(z.string()),
});

const catalogVerticalSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  reference_tenant: z.string().nullable(),
  status: verticalStatusSchema,
  recommended_package_id: z.string().min(1),
});

export const commercialCatalogSchema = z.object({
  version: z.string().min(1),
  updated: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  owner: z.string().min(1),
  currency: z.string().min(1),
  disclaimer: z.string(),
  source_docs: z.array(z.string()),
  sales_pitch_es: z.string(),
  modules: z.array(catalogModuleSchema),
  packages: z.array(catalogPackageSchema),
  verticals: z.array(catalogVerticalSchema),
  repeat_commands: z.record(z.string(), z.string()),
});

export const editableCatalogSchema = z.object({
  modules: z.array(catalogModuleSchema),
  packages: z.array(catalogPackageSchema),
  verticals: z.array(catalogVerticalSchema),
  disclaimer: z.string(),
  sales_pitch_es: z.string(),
  currency: z.string().min(1),
});

export type CatalogRisk = z.infer<typeof catalogRiskSchema>;
export type VerticalStatus = z.infer<typeof verticalStatusSchema>;
export type CatalogMoneyRange = z.infer<typeof catalogMoneyRangeSchema>;
export type CatalogModule = z.infer<typeof catalogModuleSchema>;
export type CatalogPackage = z.infer<typeof catalogPackageSchema>;
export type CatalogVertical = z.infer<typeof catalogVerticalSchema>;
export type CommercialCatalog = z.infer<typeof commercialCatalogSchema>;
export type EditableCatalogFields = z.infer<typeof editableCatalogSchema>;

export type SaveCatalogResult =
  | { ok: true; etag: string }
  | { ok: false; reason: 'stale' }
  | { ok: false; reason: 'referenced'; details: string[] }
  | { ok: false; reason: 'invalid'; message: string };

export function formatZodCatalogError(error: z.ZodError): string {
  return error.issues.map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`).join('; ');
}

export function computeEtag(raw: string): string {
  return createHash('sha256').update(raw, 'utf8').digest('hex');
}

export function getCatalogFilePath(): string {
  return join(resolveOpslyRepoRoot(), CATALOG_REL_PATH);
}

export function readCatalog(): { catalog: CommercialCatalog; etag: string } {
  const catalogPath = getCatalogFilePath();
  const raw = readFileSync(catalogPath, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  const validated = commercialCatalogSchema.safeParse(parsed);
  if (!validated.success) {
    throw new Error(formatZodCatalogError(validated.error));
  }
  return { catalog: validated.data, etag: computeEtag(raw) };
}

export function findModuleReferences(catalog: CommercialCatalog, moduleId: string): string[] {
  return catalog.packages
    .filter((pkg) => pkg.module_ids.includes(moduleId))
    .map((pkg) => `package "${pkg.id}"`);
}

export function findPackageReferences(catalog: CommercialCatalog, packageId: string): string[] {
  return catalog.verticals
    .filter((vertical) => vertical.recommended_package_id === packageId)
    .map((vertical) => `vertical "${vertical.id}"`);
}

export function assertReferentialIntegrity(catalog: CommercialCatalog): string[] {
  const moduleIds = new Set(catalog.modules.map((mod) => mod.id));
  const packageIds = new Set(catalog.packages.map((pkg) => pkg.id));
  const details: string[] = [];

  for (const pkg of catalog.packages) {
    for (const moduleId of pkg.module_ids) {
      if (!moduleIds.has(moduleId)) {
        details.push(`package "${pkg.id}" references unknown module "${moduleId}"`);
      }
    }
  }

  for (const vertical of catalog.verticals) {
    if (!packageIds.has(vertical.recommended_package_id)) {
      details.push(
        `vertical "${vertical.id}" references unknown package "${vertical.recommended_package_id}"`
      );
    }
  }

  return details;
}

function todayUtcDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function mergeEditableCatalog(
  current: CommercialCatalog,
  editable: EditableCatalogFields
): CommercialCatalog {
  return {
    version: current.version,
    owner: current.owner,
    source_docs: current.source_docs,
    repeat_commands: current.repeat_commands,
    updated: todayUtcDate(),
    currency: editable.currency,
    disclaimer: editable.disclaimer,
    sales_pitch_es: editable.sales_pitch_es,
    modules: editable.modules,
    packages: editable.packages,
    verticals: editable.verticals,
  };
}

function dedupeReferenceDetails(removed: string[], integrity: string[]): string[] {
  const removedKeys = new Set(
    removed
      .map((detail) => {
        const match = detail.match(/references removed (module|package) "([^"]+)"/);
        return match ? `${match[1]}:${match[2]}` : null;
      })
      .filter((key): key is string => key !== null)
  );

  const filteredIntegrity = integrity.filter((detail) => {
    const match = detail.match(/references unknown (module|package) "([^"]+)"/);
    if (!match) {
      return true;
    }
    return !removedKeys.has(`${match[1]}:${match[2]}`);
  });

  return [...removed, ...filteredIntegrity];
}

function findRemovedEntityReferences(
  current: CommercialCatalog,
  incoming: EditableCatalogFields
): string[] {
  const details: string[] = [];
  const incomingModuleIds = new Set(incoming.modules.map((mod) => mod.id));
  const incomingPackageIds = new Set(incoming.packages.map((pkg) => pkg.id));

  for (const removedModule of current.modules.filter((mod) => !incomingModuleIds.has(mod.id))) {
    for (const pkg of incoming.packages) {
      if (pkg.module_ids.includes(removedModule.id)) {
        details.push(`package "${pkg.id}" references removed module "${removedModule.id}"`);
      }
    }
  }

  for (const removedPackage of current.packages.filter((pkg) => !incomingPackageIds.has(pkg.id))) {
    for (const vertical of incoming.verticals) {
      if (vertical.recommended_package_id === removedPackage.id) {
        details.push(
          `vertical "${vertical.id}" references removed package "${removedPackage.id}"`
        );
      }
    }
  }

  return details;
}

function writeCatalogAtomically(catalog: CommercialCatalog): string {
  const catalogPath = getCatalogFilePath();
  const serialized = `${JSON.stringify(catalog, null, 2)}\n`;
  const tempPath = `${catalogPath}.tmp.${process.pid}`;
  writeFileSync(tempPath, serialized, 'utf8');
  renameSync(tempPath, catalogPath);
  return computeEtag(serialized);
}

export function saveCatalog(
  incomingEditable: EditableCatalogFields,
  clientEtag: string
): SaveCatalogResult {
  const editableParsed = editableCatalogSchema.safeParse(incomingEditable);
  if (!editableParsed.success) {
    return { ok: false, reason: 'invalid', message: formatZodCatalogError(editableParsed.error) };
  }

  let current: { catalog: CommercialCatalog; etag: string };
  try {
    current = readCatalog();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to read catalog';
    return { ok: false, reason: 'invalid', message };
  }

  if (current.etag !== clientEtag) {
    return { ok: false, reason: 'stale' };
  }

  const merged = mergeEditableCatalog(current.catalog, editableParsed.data);
  const fullParsed = commercialCatalogSchema.safeParse(merged);
  if (!fullParsed.success) {
    return { ok: false, reason: 'invalid', message: formatZodCatalogError(fullParsed.error) };
  }

  const referenceDetails = dedupeReferenceDetails(
    findRemovedEntityReferences(current.catalog, editableParsed.data),
    assertReferentialIntegrity(fullParsed.data)
  );
  if (referenceDetails.length > 0) {
    return { ok: false, reason: 'referenced', details: referenceDetails };
  }

  const etag = writeCatalogAtomically(fullParsed.data);
  return { ok: true, etag };
}
