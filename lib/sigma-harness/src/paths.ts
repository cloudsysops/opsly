import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));

export interface SigmaManifest {
  upstream: string;
  release: string;
  vendorPath: string;
  ruleRoots: string[];
  harness: {
    quorumMinReviews: number;
    defaultReviewers: string[];
    consensusThreshold: number;
    redisKeyPrefix: string;
  };
}

function findRepoRoot(start: string): string {
  let current = start;
  for (let i = 0; i < 8; i += 1) {
    const manifest = path.join(current, 'config', 'sigma', 'manifest.json');
    if (existsSync(manifest)) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return path.resolve(MODULE_DIR, '../../..');
}

export function loadSigmaManifest(): SigmaManifest {
  const repoRoot = findRepoRoot(process.cwd());
  const manifestPath = path.join(repoRoot, 'config', 'sigma', 'manifest.json');
  const raw = readFileSync(manifestPath, 'utf8');
  return JSON.parse(raw) as SigmaManifest;
}

export function getSigmaVendorRoot(): string {
  const manifest = loadSigmaManifest();
  const repoRoot = findRepoRoot(process.cwd());
  const fromEnv = process.env.SIGMA_VENDOR_DIR?.trim();
  if (fromEnv) {
    return path.resolve(fromEnv);
  }
  return path.join(repoRoot, manifest.vendorPath);
}

export function getRuleSearchRoots(): string[] {
  const manifest = loadSigmaManifest();
  const vendorRoot = getSigmaVendorRoot();
  return manifest.ruleRoots.map((root) => path.join(vendorRoot, root));
}

export function getHarnessConfig(): SigmaManifest['harness'] {
  return loadSigmaManifest().harness;
}
