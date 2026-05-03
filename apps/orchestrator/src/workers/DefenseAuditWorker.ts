import { createClient } from '@supabase/supabase-js';
import { Job, Worker } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { logWorkerLifecycle } from '../observability/worker-log.js';
import type { OrchestratorJob } from '../types.js';
import { getWorkerConcurrency } from '../worker-concurrency.js';

const DEFAULT_GATEWAY = 'http://127.0.0.1:3010';

function gatewayBaseUrl(): string {
  const raw =
    process.env.LLM_GATEWAY_URL ?? process.env.ORCHESTRATOR_LLM_GATEWAY_URL ?? DEFAULT_GATEWAY;
  return raw.replace(/\/$/, '');
}

function resolveSupabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    process.env.SUPABASE_URL?.trim() ||
    ''
  );
}

function resolveSupabaseKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';
}

const DEFENSE_AUDIT_SYSTEM = `You are the Opsly Defense Platform audit synthesizer.
Return ONLY valid JSON (no markdown fences). Schema:
{
  "vulnerabilities": [
    {
      "id": "string-local-id",
      "title": "string",
      "severity": "critical" | "high" | "medium" | "low",
      "cvss_score": number,
      "description": "string",
      "remediation": "string",
      "cve_id": "string optional"
    }
  ],
  "summary": {
    "total_findings": number,
    "critical_count": number,
    "high_count": number,
    "compliance_score": number
  },
  "recommendations": ["string"]
}
Base findings on the declared audit type, framework, and scope. If information is missing, produce conservative representative gaps (clearly generic) — never invent specific CVEs tied to unreleased code.`;

interface DefensePayload {
  audit_id?: string;
  audit_type?: string;
  framework?: string;
  scope?: unknown;
}

interface LlmVulnerability {
  id?: string;
  title?: string;
  severity?: string;
  cvss_score?: number;
  description?: string;
  remediation?: string;
  cve_id?: string;
}

interface LlmDefenseShape {
  vulnerabilities?: LlmVulnerability[];
  summary?: {
    total_findings?: number;
    critical_count?: number;
    high_count?: number;
    compliance_score?: number;
  };
  recommendations?: string[];
}

function parseJsonObject(text: string): LlmDefenseShape {
  const trimmed = text.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('LLM response did not contain a JSON object');
  }
  return JSON.parse(trimmed.slice(start, end + 1)) as LlmDefenseShape;
}

function normalizeSeverity(s: string | undefined): 'critical' | 'high' | 'medium' | 'low' | 'info' {
  if (s === 'critical' || s === 'high' || s === 'medium' || s === 'low' || s === 'info') {
    return s;
  }
  return 'medium';
}

async function callDefenseLlm(params: {
  tenantSlug: string;
  requestId: string;
  userPrompt: string;
}): Promise<string> {
  const url = `${gatewayBaseUrl()}/v1/text`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.ANTHROPIC_API_KEY ?? ''}`,
    },
    body: JSON.stringify({
      tenant_slug: params.tenantSlug,
      request_id: params.requestId,
      prompt: `${DEFENSE_AUDIT_SYSTEM}\n\n---\n\n${params.userPrompt}`,
      task_type: 'summarize',
      routing_bias: 'balanced',
      usage_metadata: {
        worker: 'defense_audit',
      },
    }),
  });
  const data = (await res.json()) as { content?: string; text?: string; error?: string; message?: string };
  if (!res.ok || data.error) {
    throw new Error(data.message ?? data.error ?? `gateway status ${String(res.status)}`);
  }
  const text = data.content ?? data.text ?? '';
  if (text.length === 0) {
    throw new Error('empty LLM response');
  }
  return text;
}

export async function processDefenseAuditJob(job: Job<OrchestratorJob>): Promise<void> {
  const data = job.data;
  const payload = data.payload as DefensePayload;
  const auditId = typeof payload.audit_id === 'string' ? payload.audit_id.trim() : '';
  if (auditId.length === 0) {
    throw new Error('defense_audit: missing audit_id');
  }

  const supabaseUrl = resolveSupabaseUrl();
  const supabaseKey = resolveSupabaseKey();
  if (supabaseUrl.length === 0 || supabaseKey.length === 0) {
    throw new Error('defense_audit: missing Supabase URL or service role key');
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const tenantId = typeof data.tenant_id === 'string' ? data.tenant_id : '';
  if (tenantId.length === 0) {
    throw new Error('defense_audit: missing tenant_id on job');
  }

  const started = new Date().toISOString();
  await supabase
    .schema('defense')
    .from('audits')
    .update({ status: 'in_progress', started_at: started })
    .eq('id', auditId);

  const auditType = typeof payload.audit_type === 'string' ? payload.audit_type : 'security';
  const framework = typeof payload.framework === 'string' ? payload.framework : '';
  const scopeText =
    Array.isArray(payload.scope) ? payload.scope.join(', ') : JSON.stringify(payload.scope ?? []);

  const userPrompt = [
    `Audit ID: ${auditId}`,
    `Tenant ID: ${tenantId}`,
    `Audit type: ${auditType}`,
    framework.length > 0 ? `Framework: ${framework}` : '',
    `Scope targets: ${scopeText}`,
    'Produce JSON only as specified in the system message.',
  ]
    .filter(Boolean)
    .join('\n');

  const requestId = typeof data.request_id === 'string' && data.request_id.length > 0 ? data.request_id : randomUUID();

  try {
    const rawText = await callDefenseLlm({
      tenantSlug: data.tenant_slug,
      requestId,
      userPrompt,
    });
    const parsed = parseJsonObject(rawText);
    const vulns = Array.isArray(parsed.vulnerabilities) ? parsed.vulnerabilities : [];
    const summary = parsed.summary ?? {};

    const rows = vulns.map((v) => {
      const title = typeof v.title === 'string' && v.title.length > 0 ? v.title : 'Untitled finding';
      const sev = normalizeSeverity(v.severity);
      const cvss =
        typeof v.cvss_score === 'number' && Number.isFinite(v.cvss_score)
          ? Math.min(10, Math.max(0, v.cvss_score)).toFixed(1)
          : null;
      return {
        audit_id: auditId,
        tenant_id: tenantId,
        title,
        description: typeof v.description === 'string' ? v.description : null,
        cvss_score: cvss,
        severity: sev,
        affected_component: 'assessment',
        cve_id: typeof v.cve_id === 'string' ? v.cve_id : null,
        status: 'open' as const,
        remediation: typeof v.remediation === 'string' ? v.remediation : null,
      };
    });

    if (rows.length > 0) {
      const { error: insErr } = await supabase.schema('defense').from('vulnerabilities').insert(rows);
      if (insErr) {
        throw new Error(insErr.message);
      }
    }

    const criticalCount =
      typeof summary.critical_count === 'number'
        ? summary.critical_count
        : rows.filter((r) => r.severity === 'critical').length;
    const highCount =
      typeof summary.high_count === 'number'
        ? summary.high_count
        : rows.filter((r) => r.severity === 'high').length;
    const totalFindings =
      typeof summary.total_findings === 'number' ? summary.total_findings : rows.length;

    const findingsDoc = {
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : [],
      compliance_score:
        typeof summary.compliance_score === 'number' ? summary.compliance_score : null,
    };

    const completed = new Date().toISOString();
    const { error: upErr } = await supabase
      .schema('defense')
      .from('audits')
      .update({
        status: 'completed',
        completed_at: completed,
        findings: findingsDoc,
        total_findings: totalFindings,
        critical_count: criticalCount,
        high_count: highCount,
      })
      .eq('id', auditId);

    if (upErr) {
      throw new Error(upErr.message);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await supabase
      .schema('defense')
      .from('audits')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString(),
        findings: { error: msg },
      })
      .eq('id', auditId);
    throw err;
  }
}

export function startDefenseAuditWorker(connection: object): Worker {
  const concurrency = getWorkerConcurrency('defense_audit');
  return new Worker(
    'openclaw',
    async (job: Job) => {
      if (job.name !== 'defense_audit') {
        return;
      }
      const t0 = Date.now();
      logWorkerLifecycle('start', 'defense_audit', job);
      try {
        await processDefenseAuditJob(job as Job<OrchestratorJob>);
        logWorkerLifecycle('complete', 'defense_audit', job, { duration_ms: Date.now() - t0 });
      } catch (e) {
        logWorkerLifecycle('fail', 'defense_audit', job, {
          duration_ms: Date.now() - t0,
          error: e instanceof Error ? e.message : String(e),
        });
        throw e;
      }
    },
    { connection, concurrency: concurrency > 0 ? concurrency : 1 }
  );
}
