import type { CanonService, RepoGovernanceConfig } from './types.js';

export interface OwnershipHit {
  path: string;
  service_id: string | null;
  owner: string | null;
  purpose: string | null;
}

function serviceForPath(filePath: string, services: CanonService[]): CanonService | null {
  for (const svc of services) {
    const prefix = `${svc.path}/`;
    if (filePath === svc.path || filePath.startsWith(prefix)) {
      return svc;
    }
  }
  if (filePath.startsWith('lib/')) {
    const pkg = filePath.split('/')[1];
    const match = services.find((s) => s.path === `lib/${pkg}`);
    if (match) {
      return match;
    }
  }
  if (filePath.startsWith('config/') || filePath.startsWith('infra/')) {
    return services.find((s) => s.id === 'infra') ?? null;
  }
  return null;
}

export function resolveOwnership(
  paths: string[],
  config: RepoGovernanceConfig,
): OwnershipHit[] {
  return paths.map((path) => {
    const svc = serviceForPath(path, config.canon_services);
    return {
      path,
      service_id: svc?.id ?? null,
      owner: svc?.owner ?? null,
      purpose: svc?.purpose ?? null,
    };
  });
}

export function touchedServicesFromPaths(
  paths: string[],
  config: RepoGovernanceConfig,
): string[] {
  const ids = new Set<string>();
  for (const hit of resolveOwnership(paths, config)) {
    if (hit.service_id) {
      ids.add(hit.service_id);
    }
  }
  return [...ids].sort();
}
