import fs from 'node:fs';
import path from 'node:path';
import type { ContentChannel, TrendCandidate } from './types.js';
import { getContentTenantRoot, getContentTenantsRoot } from './paths.js';
import { suggestCharactersForTopic } from './universe-bridge.js';

export function listTrendCandidates(tenantId: string, baseDir = process.cwd()): TrendCandidate[] {
  const filePath = path.join(getContentTenantRoot(tenantId, baseDir), 'trends.json');
  if (!fs.existsSync(filePath)) {
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf8')) as TrendCandidate[];
}

export function saveTrendCandidate(
  tenantId: string,
  candidate: TrendCandidate,
  baseDir = process.cwd()
): TrendCandidate {
  const root = getContentTenantRoot(tenantId, baseDir);
  fs.mkdirSync(root, { recursive: true });
  const filePath = path.join(root, 'trends.json');
  const existing = listTrendCandidates(tenantId, baseDir);
  const next = [candidate, ...existing.filter((item) => item.id !== candidate.id)];
  fs.writeFileSync(filePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');
  return candidate;
}

export function listAllTrendCandidates(
  baseDir = process.cwd()
): Array<TrendCandidate & { tenantId: string }> {
  const root = getContentTenantsRoot(baseDir);
  if (!fs.existsSync(root)) {
    return [];
  }
  const out: Array<TrendCandidate & { tenantId: string }> = [];
  for (const tenant of fs.readdirSync(root, { withFileTypes: true })) {
    if (!tenant.isDirectory()) continue;
    for (const candidate of listTrendCandidates(tenant.name, baseDir)) {
      out.push({ ...candidate, tenantId: tenant.name });
    }
  }
  return out;
}

export function createManualTrendCandidate(input: {
  tenantId: string;
  sourceUrl: string;
  creatorName: string;
  topic: string;
  claim: string;
}): TrendCandidate {
  const now = new Date().toISOString();
  return {
    id: `trend-${Date.now()}`,
    sourcePlatform: 'manual',
    sourceUrl: input.sourceUrl,
    creatorName: input.creatorName,
    topic: input.topic,
    detectedClaim: input.claim,
    summary: input.claim,
    portal: 'FUTURE',
    suggestedQuestion: input.claim.includes('?') ? input.claim : `¿${input.claim}?`,
    suggestedAngle: 'TEST',
    relevanceScore: 70,
    educationalScore: 72,
    noveltyScore: 60,
    trendScore: 65,
    rightsRisk: 'REVIEW_REQUIRED',
    status: 'discovered',
    createdAt: now,
    suggestedCharacterIds: suggestCharactersForTopic(input.topic, channelFromTenant(input.tenantId)),
  };
}

function channelFromTenant(tenantId: string): ContentChannel | undefined {
  if (
    tenantId === 'peskids' ||
    tenantId === 'splashitos' ||
    tenantId === 'bitsitos' ||
    tenantId === 'opsly-universe'
  ) {
    return tenantId;
  }
  return undefined;
}
