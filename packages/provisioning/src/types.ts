import { z } from 'zod';

const tagSpecSchema = z.object({
  name: z.string().trim().min(1),
});

const customFieldSpecSchema = z.object({
  name: z.string().trim().min(1),
  dataType: z.string().trim().min(1).default('TEXT'),
  model: z.enum(['contact', 'opportunity']).default('contact'),
  placeholder: z.string().optional(),
});

const templateSpecSchema = z.object({
  name: z.string().trim().min(1),
  subject: z.string().optional(),
  bodyHtml: z.string().optional(),
  body: z.string().optional(),
});

const formFieldSchema = z.object({
  name: z.string().trim().min(1),
  type: z.string().optional(),
  required: z.boolean().optional(),
});

const formSpecSchema = z.object({
  name: z.string().trim().min(1),
  fields: z.array(formFieldSchema).optional(),
});

const pipelineSpecSchema = z.object({
  name: z.string().trim().min(1),
  stages: z.array(z.string().trim().min(1)).min(1),
});

const calendarScheduleIntervalSchema = z.object({
  from: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/),
  to: z.string().regex(/^([01]?\d|2[0-3]):[0-5]\d$/),
});

const calendarScheduleRuleSchema = z.object({
  type: z.enum(['wday', 'date']),
  day: z
    .enum([
      'sunday',
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ])
    .optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  intervals: z.array(calendarScheduleIntervalSchema).min(1),
});

const calendarScheduleSchema = z.object({
  timezone: z.string().regex(/^[A-Za-z_]+\/[A-Za-z_]+$/),
  rules: z.array(calendarScheduleRuleSchema).min(1),
});

const calendarSpecSchema = z.object({
  name: z.string().trim().min(1),
  slug: z.string().optional(),
  calendarType: z
    .enum([
      'event',
      'round_robin',
      'class_booking',
      'collective',
      'service_booking',
      'personal',
    ])
    .optional(),
  slotDurationMinutes: z.number().int().positive().optional(),
  schedule: calendarScheduleSchema.optional(),
});

export const tenantProvisionManifestSchema = z.object({
  tenantName: z.string().trim().min(1),
  tenantSlug: z.string().trim().min(1).regex(/^[a-z0-9-]+$/),
  industry: z.string().trim().min(1),
  tags: z.array(tagSpecSchema).default([]),
  customFields: z.array(customFieldSpecSchema).default([]),
  emailTemplates: z.array(templateSpecSchema).default([]),
  smsTemplates: z.array(templateSpecSchema).default([]),
  forms: z.array(formSpecSchema).default([]),
  pipelines: z.array(pipelineSpecSchema).default([]),
  calendars: z.array(calendarSpecSchema).default([]),
});

export type TenantProvisionManifest = z.infer<typeof tenantProvisionManifestSchema>;

export type ProvisionItemStatus =
  | 'created'
  | 'skipped'
  | 'already_exists'
  | 'manual_required'
  | 'blocked'
  | 'would_create';

export interface ProvisionItemResult {
  resourceType: string;
  name: string;
  status: ProvisionItemStatus;
  message?: string;
  resourceId?: string;
}

export interface ProvisioningReport {
  tenantName: string;
  tenantSlug: string;
  locationId: string;
  dryRun: boolean;
  startedAt: string;
  finishedAt: string;
  summary: {
    created: number;
    skipped: number;
    alreadyExists: number;
    manualRequired: number;
    blocked: number;
    wouldCreate: number;
  };
  items: ProvisionItemResult[];
}

export function validateManifest(input: unknown): TenantProvisionManifest {
  return tenantProvisionManifestSchema.parse(input);
}

export function summarizeReport(items: ProvisionItemResult[]): ProvisioningReport['summary'] {
  const summary = {
    created: 0,
    skipped: 0,
    alreadyExists: 0,
    manualRequired: 0,
    blocked: 0,
    wouldCreate: 0,
  };
  for (const item of items) {
    switch (item.status) {
      case 'created':
        summary.created += 1;
        break;
      case 'skipped':
        summary.skipped += 1;
        break;
      case 'already_exists':
        summary.alreadyExists += 1;
        break;
      case 'manual_required':
        summary.manualRequired += 1;
        break;
      case 'blocked':
        summary.blocked += 1;
        break;
      case 'would_create':
        summary.wouldCreate += 1;
        break;
      default:
        break;
    }
  }
  return summary;
}
