import { callCloudSysOpsLlm, type CloudSysOpsLlmContext } from './cloudsysops-llm.js';
import { extractJsonObject } from './parse-agent-json.js';
import { CLOUDSYSOPS_SALES_AGENT_SYSTEM } from './prompts.js';
import type { SalesAgentInput, SalesAgentOutput, SalesBookingData, SalesIntent } from './types.js';

const SALES_INTENTS: readonly SalesIntent[] = [
  'diagnose',
  'recommend',
  'book',
  'upsell',
  'none',
] as const;

const SERVICE_TYPES: readonly SalesBookingData['serviceType'][] = [
  'pc-cleanup',
  'gaming-optimization',
  'office-support',
] as const;

const PRICES: readonly SalesBookingData['suggestedPrice'][] = [149, 199, 299] as const;

function isSalesIntent(v: unknown): v is SalesIntent {
  return typeof v === 'string' && (SALES_INTENTS as readonly string[]).includes(v);
}

function isServiceType(v: unknown): v is SalesBookingData['serviceType'] {
  return typeof v === 'string' && (SERVICE_TYPES as readonly string[]).includes(v);
}

function isSuggestedPrice(v: unknown): v is SalesBookingData['suggestedPrice'] {
  return typeof v === 'number' && (PRICES as readonly number[]).includes(v);
}

function isUrgency(v: unknown): v is SalesBookingData['urgency'] {
  return v === 'high' || v === 'medium' || v === 'low';
}

function parseBookingData(raw: unknown): SalesBookingData | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }
  if (typeof raw !== 'object') {
    return undefined;
  }
  const o = raw as Record<string, unknown>;
  if (!isServiceType(o.serviceType) || !isSuggestedPrice(o.suggestedPrice) || !isUrgency(o.urgency)) {
    return undefined;
  }
  return {
    serviceType: o.serviceType,
    suggestedPrice: o.suggestedPrice,
    urgency: o.urgency,
  };
}

export interface InvokeSalesAgentOptions extends CloudSysOpsLlmContext {
  input: SalesAgentInput;
}

export async function invokeSalesAgent(options: InvokeSalesAgentOptions): Promise<SalesAgentOutput> {
  const { input, ...llmCtx } = options;
  const historyJson = JSON.stringify(input.conversationHistory);
  const contextPart =
    typeof input.contextBlock === 'string' && input.contextBlock.trim().length > 0
      ? `\n\nCONTEXT:\n${input.contextBlock.trim()}`
      : '';
  const userPrompt = [
    `customerId: ${input.customerId}`,
    `tenantId: ${input.tenantId}`,
    `conversationHistory (JSON): ${historyJson}`,
    `latestMessage: ${input.message}`,
    contextPart,
  ].join('\n');

  const raw = await callCloudSysOpsLlm(llmCtx, CLOUDSYSOPS_SALES_AGENT_SYSTEM, userPrompt);

  try {
    const parsed = extractJsonObject(raw) as Record<string, unknown>;
    const response = typeof parsed.response === 'string' ? parsed.response : raw;
    const intent: SalesIntent = isSalesIntent(parsed.intent) ? parsed.intent : 'none';
    const bookingData = parseBookingData(parsed.bookingData);
    const nextAction =
      typeof parsed.nextAction === 'string' && parsed.nextAction.length > 0
        ? parsed.nextAction
        : 'review';

    return {
      response,
      intent,
      bookingData,
      nextAction,
    };
  } catch {
    return {
      response: raw.trim(),
      intent: 'none',
      nextAction: 'unclear_json',
    };
  }
}
