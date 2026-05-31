import type { ResolvedTenantCapabilities, TenantPattern } from './types.js';
import { getTenantPattern, listPatterns } from './catalog.js';

function mergeUnique(base: string[], extra: string[] | undefined): string[] {
  const set = new Set(base);
  for (const item of extra ?? []) {
    set.add(item);
  }
  return [...set];
}

export function resolveTenantCapabilities(input: {
  patternIds?: string[];
  existing?: Partial<ResolvedTenantCapabilities>;
  repoRoot?: string;
}): ResolvedTenantCapabilities {
  const pattern_ids = [...(input.patternIds ?? input.existing?.pattern_ids ?? [])];
  let capabilities = [...(input.existing?.capabilities ?? [])];
  let modules = [...(input.existing?.modules ?? [])];
  let harness_patterns = [...(input.existing?.harness_patterns ?? [])];
  let scripts = [...(input.existing?.scripts ?? [])];

  for (const id of pattern_ids) {
    const pattern = getTenantPattern(id, input.repoRoot);
    if (!pattern) {
      continue;
    }
    capabilities = mergeUnique(capabilities, pattern.capabilities);
    modules = mergeUnique(modules, pattern.modules);
    harness_patterns = mergeUnique(harness_patterns, pattern.harness_patterns);
    scripts = mergeUnique(scripts, pattern.scripts);
  }

  return { pattern_ids, capabilities, modules, harness_patterns, scripts };
}

export function suggestTenantPatternsForStack(stackType: string, repoRoot?: string): TenantPattern[] {
  return listPatterns('tenant', repoRoot).filter(
    (p): p is TenantPattern => p.kind === 'tenant' && p.stack_type === stackType
  );
}

export interface TenantProfilePatternFields {
  pattern_ids?: string[];
  capabilities?: string[];
  modules?: string[];
  harness_patterns?: string[];
}

/** Merge pattern_ids from tenant JSON with catalog-derived capabilities. */
export function enrichTenantProfile<T extends TenantProfilePatternFields>(
  profile: T,
  repoRoot?: string
): T & ResolvedTenantCapabilities {
  const resolved = resolveTenantCapabilities({
    patternIds: profile.pattern_ids,
    existing: {
      pattern_ids: profile.pattern_ids,
      capabilities: profile.capabilities,
      modules: profile.modules,
      harness_patterns: profile.harness_patterns,
    },
    repoRoot,
  });
  return {
    ...profile,
    ...resolved,
  };
}
