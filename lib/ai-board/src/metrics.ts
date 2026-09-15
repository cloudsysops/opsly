export const AI_BOARD_METRICS = [
  'leads_received',
  'hot_leads',
  'time_to_first_action',
  'drafts_generated',
  'whatsapp_opened',
  'messages_confirmed_sent',
  'trials_booked',
  'conversions',
  'automation_failures',
  'agent_jobs',
  'agent_cost',
  'local_model_jobs',
  'fallback_jobs',
] as const;

export type AiBoardMetricName = (typeof AI_BOARD_METRICS)[number];

export function isAiBoardMetric(name: string): name is AiBoardMetricName {
  return (AI_BOARD_METRICS as readonly string[]).includes(name);
}
