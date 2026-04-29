export type OpenClawEventName =
  | 'openclaw_router_decision'
  | 'openclaw_intent_result'
  | 'openclaw_intent_error';

export function logOpenClawEvent(
  event: OpenClawEventName,
  fields: Record<string, unknown>
): void {
  process.stdout.write(
    `${JSON.stringify({
      event,
      ...fields,
      ts: new Date().toISOString(),
      service: 'orchestrator',
      component: 'openclaw',
    })}\n`
  );
}
