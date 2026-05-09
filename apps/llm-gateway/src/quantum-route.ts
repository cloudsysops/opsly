import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import { PROVIDERS, type ProviderId } from './providers.js';
import { estimateQuantumEnsembleUsd } from './quantum/budget.js';
import { scoreAndRank } from './quantum/confidence.js';
import { runQuantumEnsemble } from './quantum/ensemble.js';
import { synthesizeQuantumResponses } from './quantum/synthesizer.js';
import type { LLMRequest } from './types.js';

export interface QuantumEnsembleHttpBody {
  prompt: string;
  tenant_slug: string;
  request_id?: string;
  tenant_plan?: 'startup' | 'business' | 'enterprise';
  models?: string[];
  /** Si true, solo devuelve estimación de coste (sin llamadas LLM). */
  estimate_only?: boolean;
  /** Debe ser true para ejecutar el ensemble completo. */
  confirm_budget?: boolean;
  /** Tope opcional; si la estimación lo supera y confirm_budget, 400. */
  budget_cap_usd?: number;
}

const DEFAULT_MODELS: ProviderId[] = ['claude_haiku', 'deepseek_chat', 'gpt4o_mini'];

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => {
      chunks.push(c);
    });
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'));
    });
    req.on('error', reject);
  });
}

function resolveModelIds(raw: unknown): ProviderId[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    return [...DEFAULT_MODELS];
  }
  const ids = raw.filter((x): x is ProviderId => typeof x === 'string' && x in PROVIDERS);
  return ids.length > 0 ? ids : [...DEFAULT_MODELS];
}

export async function handleQuantumHttp(req: IncomingMessage, res: ServerResponse): Promise<boolean> {
  const pathOnly = req.url?.split('?')[0] ?? '/';
  if (pathOnly !== '/v1/quantum/ensemble' || req.method !== 'POST') {
    return false;
  }

  let bodyRaw: string;
  try {
    bodyRaw = await readBody(req);
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'invalid_body' }));
    return true;
  }

  let body: QuantumEnsembleHttpBody;
  try {
    body = JSON.parse(bodyRaw) as QuantumEnsembleHttpBody;
  } catch {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'json_parse_error' }));
    return true;
  }

  if (typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'prompt_required' }));
    return true;
  }
  if (typeof body.tenant_slug !== 'string' || body.tenant_slug.length === 0) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'tenant_slug_required' }));
    return true;
  }

  const requestId = body.request_id?.trim() || randomUUID();
  const modelIds = resolveModelIds(body.models);
  const est = estimateQuantumEnsembleUsd(modelIds, body.prompt.length);

  const estimateOnly = body.estimate_only === true;
  const confirmed = body.confirm_budget === true;

  if (!confirmed || estimateOnly) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        mode: 'estimate',
        request_id: requestId,
        tenant_slug: body.tenant_slug,
        estimate_usd: est.total_usd,
        per_provider_usd: est.per_provider_usd,
        models: modelIds,
        note: estimateOnly
          ? 'estimate_only: no LLM calls executed'
          : 'set confirm_budget true to run ensemble',
      })
    );
    return true;
  }

  if (body.budget_cap_usd !== undefined && est.total_usd > body.budget_cap_usd) {
    res.writeHead(400, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'budget_cap_exceeded',
        estimate_usd: est.total_usd,
        budget_cap_usd: body.budget_cap_usd,
      })
    );
    return true;
  }

  const baseReq: LLMRequest = {
    tenant_slug: body.tenant_slug,
    request_id: requestId,
    tenant_plan: body.tenant_plan,
    messages: [{ role: 'user', content: body.prompt }],
    legacy_pipeline: true,
    skip_repo_context: true,
    cache: false,
    usage_metadata: { quantum: true },
  };

  const branches = await runQuantumEnsemble(modelIds, baseReq);
  const summaries = branches.map((b) => ({
    id: b.id,
    ok: b.ok,
    content: b.content ?? b.error ?? '',
  }));
  const ranked = scoreAndRank(summaries);
  const forSynth = ranked
    .filter((s) => s.ok && s.content.trim().length > 0)
    .slice(0, 6)
    .map((s) => ({ id: s.id, content: s.content }));

  if (forSynth.length === 0) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'ensemble_all_failed',
        request_id: requestId,
        branches,
      })
    );
    return true;
  }

  const finalRes = await synthesizeQuantumResponses(body.prompt, forSynth, baseReq);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(
    JSON.stringify({
      mode: 'completed',
      request_id: requestId,
      tenant_slug: body.tenant_slug,
      content: finalRes.content,
      synthesis: {
        model_used: finalRes.model_used,
        tokens_input: finalRes.tokens_input,
        tokens_output: finalRes.tokens_output,
        cost_usd: finalRes.cost_usd,
        latency_ms: finalRes.latency_ms,
      },
      branches,
      estimate_usd: est.total_usd,
    })
  );
  return true;
}
