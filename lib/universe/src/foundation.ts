import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { UniverseFoundationSchema } from './schemas.js';
import type { UniverseFoundation } from './types.js';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, '../../../');
const FOUNDATION_PATH = join(repoRoot, 'config/universe/foundation.json');

let cachedFoundation: UniverseFoundation | null = null;

export function loadFoundation(): UniverseFoundation {
  if (cachedFoundation) return cachedFoundation;
  const parsed = JSON.parse(readFileSync(FOUNDATION_PATH, 'utf8')) as unknown;
  cachedFoundation = UniverseFoundationSchema.parse(parsed);
  return cachedFoundation;
}

export function getFoundation(): UniverseFoundation {
  return loadFoundation();
}

export function getVision(): string {
  return getFoundation().futureVision.statement;
}

export function getPrinciples(): string[] {
  return [...getFoundation().principles];
}

export function getHistory(): UniverseFoundation['historicalEras'] {
  return [...getFoundation().historicalEras];
}

export function getNonNegotiables(): string[] {
  return [...getFoundation().nonNegotiables];
}

export function getChildSafetyPrinciples(): string[] {
  return [...getFoundation().childSafety];
}
