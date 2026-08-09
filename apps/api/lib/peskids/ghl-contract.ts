import { z } from 'zod';

const nameField = z
  .string()
  .trim()
  .min(2, 'name must be at least 2 characters')
  .max(100, 'name must be at most 100 characters');

const phoneField = z
  .string()
  .trim()
  .min(7, 'phone must be at least 7 characters')
  .max(20, 'phone must be at most 20 characters')
  .regex(/^[0-9+\-().\s]*$/, 'invalid phone');

const interestField = z
  .string()
  .trim()
  .min(2, 'interest must be at least 2 characters')
  .max(80, 'interest must be at most 80 characters');

export const PESKIDS_PIPELINE_STAGES = [
  'New Lead',
  'Contacted',
  'Trial Class',
  'Enrolled',
  'Active Student',
  'Renewal',
  'Lost',
] as const;

export type PeskidsPipelineStage = (typeof PESKIDS_PIPELINE_STAGES)[number];

export const PESKIDS_AUTOMATION_ACTIONS = [
  'welcome_message',
  'reminder',
  'trial_class_invitation',
] as const;

export type PeskidsAutomationAction = (typeof PESKIDS_AUTOMATION_ACTIONS)[number];

export const peskidsLeadIntakeSchema = z.object({
  parent_name: nameField,
  phone: phoneField,
  email: z.string().trim().email('valid email required'),
  child_name: nameField,
  age: z.coerce.number().int().min(3, 'age must be at least 3').max(18, 'age must be at most 18'),
  interest: interestField,
});

export type PeskidsLeadIntake = z.infer<typeof peskidsLeadIntakeSchema>;

export const goHighLevelLeadWebhookSchema = z
  .object({
    event_id: z.string().trim().min(1),
    event_type: z.literal('lead.created'),
    tenant_slug: z.literal('peskids'),
    source: z.enum(['gohighlevel', 'n8n', 'web']).default('gohighlevel'),
    lead_id: z.string().trim().min(1),
    pipeline_stage: z.enum(PESKIDS_PIPELINE_STAGES).or(z.string().trim().min(1)),
    occurred_at: z.string().datetime(),
    lead: peskidsLeadIntakeSchema,
    automation: z
      .object({
        welcome_message: z.boolean().default(true),
        reminder: z.boolean().default(true),
        trial_class_invitation: z.boolean().default(true),
      })
      .default({
        welcome_message: true,
        reminder: true,
        trial_class_invitation: true,
      }),
    ghl: z
      .object({
        contact_id: z.string().trim().min(1).optional(),
        opportunity_id: z.string().trim().min(1).optional(),
        pipeline_id: z.string().trim().min(1).optional(),
        stage_id: z.string().trim().min(1).optional(),
      })
      .optional(),
  })
  .strict();

export type GoHighLevelLeadWebhook = z.infer<typeof goHighLevelLeadWebhookSchema>;

export function normalizePeskidsPipelineStage(value: string): PeskidsPipelineStage {
  const normalized = value.trim().toLowerCase();
  switch (normalized) {
    case 'contacted':
      return 'Contacted';
    case 'trial class':
    case 'trial':
      return 'Trial Class';
    case 'enrolled':
      return 'Enrolled';
    case 'active student':
    case 'active':
      return 'Active Student';
    case 'renewal':
      return 'Renewal';
    case 'lost':
      return 'Lost';
    default:
      return 'New Lead';
  }
}

export function leadStatusFromPipelineStage(
  stage: PeskidsPipelineStage
): 'new' | 'contacted' | 'qualified' | 'converted' | 'lost' {
  switch (stage) {
    case 'Contacted':
      return 'contacted';
    case 'Trial Class':
      return 'qualified';
    case 'Enrolled':
    case 'Active Student':
    case 'Renewal':
      return 'converted';
    case 'Lost':
      return 'lost';
    default:
      return 'new';
  }
}

export function buildPeskidsAutomationPayload(
  input: GoHighLevelLeadWebhook
): Record<string, unknown> {
  return {
    tenant_slug: input.tenant_slug,
    lead_id: input.lead_id,
    event_id: input.event_id,
    event_type: input.event_type,
    source: input.source,
    stage: normalizePeskidsPipelineStage(input.pipeline_stage),
    automation: input.automation,
    lead: input.lead,
    ghl: input.ghl ?? null,
    next_actions: Object.entries(input.automation)
      .filter(([, enabled]) => enabled)
      .map(([action]) => action),
  };
}
