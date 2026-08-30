import catalogJson from '../../../config/commercial-catalog.json';

/**
 * Statically imports config/commercial-catalog.json so entitlement grants
 * can be checked against the real catalog instead of just a format regex.
 * Must be a build-time import (not fs.readFileSync at runtime): the API's
 * production image (apps/api/Dockerfile) only copies .next/standalone,
 * .next/static, and public into the runtime stage — config/ isn't there, so
 * a runtime file read would throw ENOENT in production. A static import
 * gets inlined into the compiled bundle at `next build` time instead, same
 * pattern apps/icso/lib/commercial-catalog.ts already uses.
 */

interface CommercialCatalogModule {
  id: string;
}

interface CommercialCatalogFile {
  modules: CommercialCatalogModule[];
}

const catalog = catalogJson as CommercialCatalogFile;

let cachedModuleIds: Set<string> | null = null;

export function getCommercialCatalogModuleIds(): Set<string> {
  if (!cachedModuleIds) {
    cachedModuleIds = new Set(catalog.modules.map((mod) => mod.id));
  }
  return cachedModuleIds;
}
