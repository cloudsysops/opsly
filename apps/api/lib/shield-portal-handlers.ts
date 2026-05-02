import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { HTTP_STATUS } from './constants';
import { listShieldScoreHistory, listShieldSecretFindings } from './repositories/shield-repository';
import {
  SHIELD_RISK_GREEN_THRESHOLD,
  SHIELD_RISK_YELLOW_MIN,
  SHIELD_SCORE_TREND_MAX_POINTS,
  SHIELD_SECRETS_DASHBOARD_LIMIT,
  SHIELD_TREND_DAYS,
} from './shield-constants';
import { computeShieldScore } from './shield-score';
import { meterShieldApiCall } from './shield-metering';
import { applyShieldSecretStatusPatch } from './shield-secret-patch';

function riskLevelFromScore(score: number): 'green' | 'yellow' | 'red' {
  if (score > SHIELD_RISK_GREEN_THRESHOLD) {
    return 'green';
  }
  if (score >= SHIELD_RISK_YELLOW_MIN) {
    return 'yellow';
  }
  return 'red';
}

const patchFindingSchema = z.object({
  status: z.enum(['open', 'resolved', 'false_positive']),
});

export async function handleGetShieldSecrets(
  request: NextRequest,
  slug: string
): Promise<Response> {
  const hdrId = request.headers.get('x-request-id')?.trim();
  const findings = await listShieldSecretFindings(slug, { limit: SHIELD_SECRETS_DASHBOARD_LIMIT });
  void meterShieldApiCall({
    tenant_slug: slug,
    ...(hdrId !== undefined && hdrId.length > 0 ? { request_id: hdrId } : {}),
    feature: 'shield_secrets_list',
    metadata: { count: findings.length },
  });
  return Response.json({ tenant_slug: slug, findings });
}

export async function handleGetShieldScore(request: NextRequest, slug: string): Promise<Response> {
  const hdrId = request.headers.get('x-request-id')?.trim();
  const since = new Date();
  since.setDate(since.getDate() - SHIELD_TREND_DAYS);
  const sinceIso = since.toISOString();

  const history = await listShieldScoreHistory(slug, {
    sinceIso,
    limit: SHIELD_SCORE_TREND_MAX_POINTS,
  });
  const latestRow = history[0] ?? null;

  let currentScore: number;
  let breakdown: Record<string, unknown>;

  if (latestRow !== null && latestRow.score !== null) {
    currentScore = latestRow.score;
    breakdown = (latestRow.breakdown as Record<string, unknown> | null) ?? {};
  } else {
    const computed = await computeShieldScore(slug);
    currentScore = computed.score;
    breakdown = computed.breakdown;
  }

  const trend = [...history]
    .reverse()
    .map((r) => ({
      score: r.score,
      created_at: r.created_at,
    }))
    .filter((p) => p.score !== null);

  void meterShieldApiCall({
    tenant_slug: slug,
    ...(hdrId !== undefined && hdrId.length > 0 ? { request_id: hdrId } : {}),
    feature: 'shield_score_get',
    metadata: { current_score: currentScore, history_points: trend.length },
  });

  return Response.json({
    tenant_slug: slug,
    current: {
      score: currentScore,
      breakdown,
      created_at: latestRow?.created_at ?? null,
    },
    history: trend,
    risk_level: riskLevelFromScore(currentScore),
  });
}

export async function handlePatchShieldSecret(
  request: NextRequest,
  slug: string,
  findingId: string
): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: HTTP_STATUS.BAD_REQUEST });
  }
  const parsed = patchFindingSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: 'Invalid body', details: parsed.error.flatten() },
      { status: HTTP_STATUS.BAD_REQUEST }
    );
  }
  return applyShieldSecretStatusPatch({
    request,
    slug,
    findingId,
    status: parsed.data.status,
  });
}
