import { callCloudSysOpsLlm, type CloudSysOpsLlmContext } from './cloudsysops-llm.js';
import { extractJsonObject } from './parse-agent-json.js';
import { CLOUDSYSOPS_OPS_AGENT_SYSTEM } from './prompts.js';
import type {
  OpsAgentInput,
  OpsAgentOutput,
  OpsFollowUpSchedule,
  OpsReportContent,
} from './types.js';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function parseReportContent(raw: unknown): OpsReportContent | null {
  if (!isRecord(raw)) {
    return null;
  }
  const findings = typeof raw.findings === 'string' ? raw.findings : '';
  const actions = typeof raw.actions === 'string' ? raw.actions : '';
  const results = typeof raw.results === 'string' ? raw.results : '';
  const recommendations =
    typeof raw.recommendations === 'string' ? raw.recommendations : '';
  if (!findings && !actions && !results && !recommendations) {
    return null;
  }
  return { findings, actions, results, recommendations };
}

function parseFollowUp(raw: unknown): OpsFollowUpSchedule | null {
  if (!isRecord(raw)) {
    return null;
  }
  const thirtyDays = typeof raw.thirtyDays === 'string' ? raw.thirtyDays : '';
  const sixtyDays = typeof raw.sixtyDays === 'string' ? raw.sixtyDays : '';
  const ninetyDays = typeof raw.ninetyDays === 'string' ? raw.ninetyDays : '';
  if (!thirtyDays && !sixtyDays && !ninetyDays) {
    return null;
  }
  return { thirtyDays, sixtyDays, ninetyDays };
}

export interface InvokeOpsAgentOptions extends CloudSysOpsLlmContext {
  input: OpsAgentInput;
}

export async function invokeOpsAgent(options: InvokeOpsAgentOptions): Promise<OpsAgentOutput> {
  const { input, ...llmCtx } = options;
  const userPrompt = [
    `bookingId: ${input.bookingId}`,
    `tenantId: ${input.tenantId}`,
    `serviceType: ${input.serviceType}`,
    `findings: ${input.findings}`,
    `actionsPerformed: ${input.actionsPerformed}`,
    `metricsBeforeAfter: ${JSON.stringify(input.metricsBeforeAfter)}`,
    `customerSatisfaction (1-5): ${String(input.customerSatisfaction)}`,
  ].join('\n');

  const raw = await callCloudSysOpsLlm(llmCtx, CLOUDSYSOPS_OPS_AGENT_SYSTEM, userPrompt);
  const parsed = extractJsonObject(raw) as Record<string, unknown>;

  const reportContent = parseReportContent(parsed.reportContent) ?? {
    findings: input.findings,
    actions: input.actionsPerformed,
    results: JSON.stringify(input.metricsBeforeAfter),
    recommendations: '',
  };
  const followUpSchedule = parseFollowUp(parsed.followUpSchedule) ?? {
    thirtyDays: '',
    sixtyDays: '',
    ninetyDays: '',
  };
  const upsellSuggestion =
    typeof parsed.upsellSuggestion === 'string' ? parsed.upsellSuggestion : '';
  const nextMaintenanceDate =
    typeof parsed.nextMaintenanceDate === 'string' ? parsed.nextMaintenanceDate : '';

  return {
    reportContent,
    upsellSuggestion,
    followUpSchedule,
    nextMaintenanceDate,
  };
}
