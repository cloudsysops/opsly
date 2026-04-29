/**
 * Test fixtures for meta-optimizer: REAL orchestrator prompts (mixed types).
 * Used to validate improvement scoring and rollback triggers.
 */

/**
 * Case 1: Routing/Dispatch prompt (IntentDispatchWorker context)
 * Original: Simple dispatch routing decision
 */
export const ROUTING_DISPATCH_PROMPT = {
  original: `You are routing an intent to the appropriate handler.
Intent request received:
- Type: oar_react
- Tenant: acme-prod
- Context: deploy application

Determine which worker should handle this intent and return the decision.`,

  testCases: [
    {
      input: 'Deploy the main application to production',
      expectedKeywords: ['routing', 'intent', 'handler'],
    },
    {
      input: 'Execute terraform plan',
      expectedKeywords: ['routing', 'infrastructure'],
    },
  ],
};

/**
 * Case 2: Intent Validation prompt
 * Original: Validates intent payload structure and required fields
 */
export const INTENT_VALIDATION_PROMPT = {
  original: `Validate the following intent payload:

Intent must have:
- type: one of [cursor, n8n, notify, drive, backup, health, ollama, research, evolution, sandbox_execution, jcode_execution, hive_objective, intent_dispatch, agent_farm, terminal_task]
- payload: non-empty object
- initiated_by: one of [claude, discord, cron, system]

Check the payload and report any validation errors.`,

  testCases: [
    {
      input: 'intent_dispatch with intent_request payload',
      expectedKeywords: ['validate', 'payload', 'structure'],
    },
    {
      input: 'agent_farm with missing required fields',
      expectedKeywords: ['validation', 'error', 'required'],
    },
  ],
};

/**
 * Case 3: Context Enrichment prompt (ReAct strategy context building)
 * Original: Enriches context from memory and working state
 */
export const CONTEXT_ENRICHMENT_PROMPT = {
  original: `Enrich the user's intent with context from working memory:

Current working context:
{tenant_slug, session_id, prior_steps, environment}

For the given user prompt, determine what additional context from memory would improve the agent's reasoning.
Include: relevant history, environmental state, prior decisions, and constraints.`,

  testCases: [
    {
      input: 'Create a new API endpoint',
      expectedKeywords: ['context', 'enrich', 'memory', 'reasoning'],
    },
    {
      input: 'Deploy to production',
      expectedKeywords: ['context', 'environment', 'constraints'],
    },
  ],
};

/**
 * Utility: Extract test prompts for meta-optimizer validation
 */
export function getTestPrompts() {
  return [
    { name: 'routing-dispatch', prompt: ROUTING_DISPATCH_PROMPT.original },
    { name: 'intent-validation', prompt: INTENT_VALIDATION_PROMPT.original },
    { name: 'context-enrichment', prompt: CONTEXT_ENRICHMENT_PROMPT.original },
  ];
}
