import type {
  AnyPattern,
  AppliedHarnessPattern,
  HarnessPattern,
  OpslyPattern,
  PatternCatalogIndex,
  TenantPattern,
} from './types.js';
import { loadPatternFile, loadPatternIndex } from './paths.js';

let cachedPatterns: Map<string, AnyPattern> | null = null;

function loadAllPatterns(repoRoot?: string): Map<string, AnyPattern> {
  if (cachedPatterns && !repoRoot) {
    return cachedPatterns;
  }
  const index = loadPatternIndex(repoRoot);
  const map = new Map<string, AnyPattern>();
  for (const rel of index.harness) {
    const p = loadPatternFile<HarnessPattern>(rel, repoRoot);
    map.set(p.id, p);
  }
  for (const rel of index.tenant) {
    const p = loadPatternFile<TenantPattern>(rel, repoRoot);
    map.set(p.id, p);
  }
  for (const rel of index.opsly) {
    const p = loadPatternFile<OpslyPattern>(rel, repoRoot);
    map.set(p.id, p);
  }
  if (!repoRoot) {
    cachedPatterns = map;
  }
  return map;
}

export function clearPatternCache(): void {
  cachedPatterns = null;
}

export function listPatterns(kind?: AnyPattern['kind'], repoRoot?: string): AnyPattern[] {
  const all = [...loadAllPatterns(repoRoot).values()];
  if (!kind) {
    return all;
  }
  return all.filter((p) => p.kind === kind);
}

export function getPattern(id: string, repoRoot?: string): AnyPattern | null {
  return loadAllPatterns(repoRoot).get(id) ?? null;
}

export function getHarnessPattern(id: string, repoRoot?: string): HarnessPattern | null {
  const p = getPattern(id, repoRoot);
  return p?.kind === 'harness' ? p : null;
}

export function getTenantPattern(id: string, repoRoot?: string): TenantPattern | null {
  const p = getPattern(id, repoRoot);
  return p?.kind === 'tenant' ? p : null;
}

export function getOpslyPattern(id: string, repoRoot?: string): OpslyPattern | null {
  const p = getPattern(id, repoRoot);
  return p?.kind === 'opsly' ? p : null;
}

export function applyHarnessPattern(input: {
  patternId: string;
  topic: string;
  summary: string;
  repoRoot?: string;
}): AppliedHarnessPattern | null {
  const pattern = getHarnessPattern(input.patternId, input.repoRoot);
  if (!pattern) {
    return null;
  }
  const prefix = pattern.proposalTemplate?.topicPrefix ?? '';
  const hints = pattern.sigmaQueryHints ?? [];
  const tags = pattern.sigmaTags ?? [];
  const sigmaSearchText = [...hints, ...tags, input.topic, input.summary].join(' ');
  return {
    pattern,
    reviewers: pattern.reviewers,
    harnessOverrides: pattern.harnessOverrides ?? {},
    sigmaSearchText,
    topic: prefix ? `${prefix}${input.topic}` : input.topic,
  };
}

export function getCatalogIndex(repoRoot?: string): PatternCatalogIndex {
  return loadPatternIndex(repoRoot);
}
