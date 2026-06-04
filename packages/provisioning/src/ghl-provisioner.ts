import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { GoHighLevelClient } from '@intcloudsysops/services/gohighlevel/index.js';
import type {
  ProvisionItemResult,
  ProvisioningReport,
  TenantProvisionManifest,
} from './types.js';
import { summarizeReport, validateManifest } from './types.js';

export interface GhlProvisionerOptions {
  dryRun?: boolean;
  locationId: string;
}

function normalizeName(value: string): string {
  return value.trim().toLowerCase();
}

function pushItem(
  items: ProvisionItemResult[],
  resourceType: string,
  name: string,
  status: ProvisionItemResult['status'],
  message?: string,
  resourceId?: string
): void {
  items.push({ resourceType, name, status, message, resourceId });
}

export class GhlProvisioningAgent {
  private readonly client: GoHighLevelClient;
  private readonly manifest: TenantProvisionManifest;
  private readonly dryRun: boolean;
  private readonly locationId: string;

  constructor(
    client: GoHighLevelClient,
    manifest: TenantProvisionManifest,
    options: GhlProvisionerOptions
  ) {
    this.client = client;
    this.manifest = manifest;
    this.dryRun = options.dryRun !== false;
    this.locationId = options.locationId;
  }

  validateManifest(): TenantProvisionManifest {
    return validateManifest(this.manifest);
  }

  async provisionTags(items: ProvisionItemResult[]): Promise<void> {
    let existing: Awaited<ReturnType<GoHighLevelClient['listTags']>> = [];
    try {
      existing = await this.client.listTags();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (const tag of this.manifest.tags) {
        pushItem(
          items,
          'tag',
          tag.name,
          this.dryRun ? 'would_create' : 'blocked',
          this.dryRun ? `Planned — ${message}` : message
        );
      }
      return;
    }

    const byName = new Map(existing.map((tag) => [normalizeName(tag.name), tag]));

    for (const tag of this.manifest.tags) {
      const found = byName.get(normalizeName(tag.name));
      if (found) {
        pushItem(items, 'tag', tag.name, 'already_exists', undefined, found.id);
        continue;
      }
      if (this.dryRun) {
        pushItem(items, 'tag', tag.name, 'would_create', 'Dry run — tag would be created');
        continue;
      }
      const created = await this.client.createTag({ name: tag.name });
      pushItem(items, 'tag', tag.name, 'created', undefined, created.id);
      byName.set(normalizeName(tag.name), created);
    }
  }

  async provisionCustomFields(items: ProvisionItemResult[]): Promise<void> {
    let existing: Awaited<ReturnType<GoHighLevelClient['listCustomFields']>> = [];
    try {
      existing = await this.client.listCustomFields();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (const field of this.manifest.customFields) {
        pushItem(
          items,
          'custom_field',
          field.name,
          this.dryRun ? 'would_create' : 'blocked',
          this.dryRun ? `Planned — ${message}` : message
        );
      }
      return;
    }

    const byName = new Map(existing.map((field) => [normalizeName(field.name), field]));

    for (const field of this.manifest.customFields) {
      const found = byName.get(normalizeName(field.name));
      if (found) {
        pushItem(items, 'custom_field', field.name, 'already_exists', undefined, found.id);
        continue;
      }
      if (this.dryRun) {
        pushItem(
          items,
          'custom_field',
          field.name,
          'would_create',
          `Dry run — ${field.dataType} on ${field.model}`
        );
        continue;
      }
      const created = await this.client.createCustomField({
        name: field.name,
        dataType: field.dataType,
        model: field.model,
        placeholder: field.placeholder,
      });
      pushItem(items, 'custom_field', field.name, 'created', undefined, created.id);
      byName.set(normalizeName(field.name), created);
    }
  }

  async provisionTemplates(items: ProvisionItemResult[]): Promise<void> {
    for (const template of this.manifest.emailTemplates) {
      pushItem(
        items,
        'email_template',
        template.name,
        'manual_required',
        'Email templates must be created or imported in GHL UI (Claude Chrome / manual). Opsly records spec only.'
      );
    }
    for (const template of this.manifest.smsTemplates) {
      pushItem(
        items,
        'sms_template',
        template.name,
        'manual_required',
        'SMS templates require GHL UI or Conversation AI setup — not exposed for safe automation.'
      );
    }
  }

  async provisionForms(items: ProvisionItemResult[]): Promise<void> {
    let existing: Awaited<ReturnType<GoHighLevelClient['listForms']>> = [];
    let listError: string | undefined;
    try {
      existing = await this.client.listForms();
    } catch (error) {
      listError = error instanceof Error ? error.message : String(error);
    }

    const byName = new Map(existing.map((form) => [normalizeName(form.name), form]));

    for (const form of this.manifest.forms) {
      const found = byName.get(normalizeName(form.name));
      if (found) {
        pushItem(items, 'form', form.name, 'already_exists', undefined, found.id);
        continue;
      }
      if (listError) {
        pushItem(
          items,
          'form',
          form.name,
          this.dryRun ? 'would_create' : 'manual_required',
          listError
        );
        continue;
      }
      if (this.dryRun) {
        pushItem(items, 'form', form.name, 'would_create', 'Dry run — form would be created');
        continue;
      }
      try {
        const created = await this.client.createForm(form);
        pushItem(items, 'form', form.name, 'created', undefined, created.id);
        byName.set(normalizeName(form.name), created);
      } catch (error) {
        pushItem(
          items,
          'form',
          form.name,
          'manual_required',
          error instanceof Error ? error.message : String(error)
        );
      }
    }
  }

  async validatePipeline(items: ProvisionItemResult[]): Promise<void> {
    let pipelines: Awaited<ReturnType<GoHighLevelClient['listPipelines']>> = [];
    try {
      pipelines = await this.client.listPipelines();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (const pipeline of this.manifest.pipelines) {
        pushItem(
          items,
          'pipeline',
          pipeline.name,
          this.dryRun ? 'manual_required' : 'blocked',
          this.dryRun
            ? `Validate when API available — ${message}`
            : message
        );
      }
      return;
    }

    for (const expected of this.manifest.pipelines) {
      const pipeline = pipelines.find((p) => normalizeName(p.name) === normalizeName(expected.name));
      if (!pipeline) {
        pushItem(
          items,
          'pipeline',
          expected.name,
          'manual_required',
          'Pipeline not found in location — create in GHL UI or import snapshot'
        );
        continue;
      }

      const stageNames = new Set(
        (pipeline.stages ?? []).map((stage) => normalizeName(stage.name))
      );
      const missingStages = expected.stages.filter(
        (stage) => !stageNames.has(normalizeName(stage))
      );

      if (missingStages.length > 0) {
        pushItem(
          items,
          'pipeline',
          expected.name,
          'manual_required',
          `Missing stages: ${missingStages.join(', ')}`
        );
        continue;
      }

      pushItem(
        items,
        'pipeline',
        expected.name,
        'already_exists',
        'Pipeline and stages validated',
        pipeline.id
      );
    }
  }

  async validateCalendar(items: ProvisionItemResult[]): Promise<void> {
    await this.provisionCalendars(items);
  }

  async provisionCalendars(items: ProvisionItemResult[]): Promise<void> {
    let calendars: Awaited<ReturnType<GoHighLevelClient['listCalendars']>> = [];
    try {
      calendars = await this.client.listCalendars();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      for (const calendar of this.manifest.calendars) {
        pushItem(
          items,
          'calendar',
          calendar.name,
          this.dryRun ? 'manual_required' : 'blocked',
          this.dryRun
            ? `Validate when API available — ${message}`
            : message
        );
      }
      return;
    }

    for (const expected of this.manifest.calendars) {
      const calendar = calendars.find((entry) => {
        if (normalizeName(entry.name) === normalizeName(expected.name)) {
          return true;
        }
        if (expected.slug && entry.slug) {
          return normalizeName(entry.slug) === normalizeName(expected.slug);
        }
        return false;
      });

      if (!calendar) {
        if (this.dryRun) {
          pushItem(
            items,
            'calendar',
            expected.name,
            'would_create',
            expected.schedule
              ? 'Dry run — calendar + availability schedule would be created'
              : 'Dry run — calendar would be created'
          );
          continue;
        }
        try {
          const created = await this.client.createCalendar({
            name: expected.name,
            slug: expected.slug,
            calendarType: expected.calendarType ?? 'event',
            slotDuration: expected.slotDurationMinutes ?? 30,
            slotDurationUnit: 'mins',
            isActive: true,
          });
          if (expected.schedule) {
            await this.client.createEventCalendarSchedule(created.id, expected.schedule);
            pushItem(
              items,
              'calendar',
              expected.name,
              'created',
              'Calendar and availability schedule created',
              created.id
            );
          } else {
            pushItem(items, 'calendar', expected.name, 'created', undefined, created.id);
          }
        } catch (error) {
          pushItem(
            items,
            'calendar',
            expected.name,
            'manual_required',
            error instanceof Error ? error.message : String(error)
          );
        }
        continue;
      }

      if (expected.schedule && !this.dryRun) {
        try {
          await this.client.createEventCalendarSchedule(calendar.id, expected.schedule);
          pushItem(
            items,
            'calendar',
            expected.name,
            'already_exists',
            'Calendar exists — availability schedule applied',
            calendar.id
          );
        } catch (error) {
          pushItem(
            items,
            'calendar',
            expected.name,
            'manual_required',
            `Calendar exists but schedule update failed: ${
              error instanceof Error ? error.message : String(error)
            }`
          );
        }
        continue;
      }

      pushItem(
        items,
        'calendar',
        expected.name,
        'already_exists',
        expected.schedule
          ? 'Calendar validated — schedule unchanged (dry run or already configured)'
          : 'Calendar validated',
        calendar.id
      );
    }
  }

  generateReport(items: ProvisionItemResult[], startedAt: string): ProvisioningReport {
    const finishedAt = new Date().toISOString();
    return {
      tenantName: this.manifest.tenantName,
      tenantSlug: this.manifest.tenantSlug,
      locationId: this.locationId,
      dryRun: this.dryRun,
      startedAt,
      finishedAt,
      summary: summarizeReport(items),
      items,
    };
  }

  async run(): Promise<ProvisioningReport> {
    const startedAt = new Date().toISOString();
    this.validateManifest();
    const items: ProvisionItemResult[] = [];

    await this.provisionTags(items);
    await this.provisionCustomFields(items);
    await this.provisionTemplates(items);
    await this.provisionForms(items);
    await this.validatePipeline(items);
    await this.provisionCalendars(items);

    return this.generateReport(items, startedAt);
  }
}

export function formatReportMarkdown(report: ProvisioningReport): string {
  const lines = [
    `# GHL Provisioning Report — ${report.tenantName}`,
    '',
    `- **Tenant slug:** ${report.tenantSlug}`,
    `- **Location ID:** ${report.locationId}`,
    `- **Mode:** ${report.dryRun ? 'DRY RUN' : 'EXECUTE'}`,
    `- **Started:** ${report.startedAt}`,
    `- **Finished:** ${report.finishedAt}`,
    '',
    '## Summary',
    '',
    `| Status | Count |`,
    `|--------|-------|`,
    `| Created | ${report.summary.created} |`,
    `| Would create | ${report.summary.wouldCreate} |`,
    `| Already exists | ${report.summary.alreadyExists} |`,
    `| Skipped | ${report.summary.skipped} |`,
    `| Manual required | ${report.summary.manualRequired} |`,
    `| Blocked | ${report.summary.blocked} |`,
    '',
    '## Items',
    '',
    '| Type | Name | Status | Notes |',
    '|------|------|--------|-------|',
  ];

  for (const item of report.items) {
    const note = item.message ?? item.resourceId ?? '';
    lines.push(`| ${item.resourceType} | ${item.name} | ${item.status} | ${note.replace(/\|/g, '\\|')} |`);
  }

  return lines.join('\n');
}

export async function writeProvisioningReports(
  report: ProvisioningReport,
  outputDir: string
): Promise<{ jsonPath: string; mdPath: string }> {
  const dir = path.resolve(outputDir);
  await mkdir(dir, { recursive: true });
  const base = `provision-report-${report.tenantSlug}`;
  const jsonPath = path.join(dir, `${base}.json`);
  const mdPath = path.join(dir, `${base}.md`);
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(mdPath, `${formatReportMarkdown(report)}\n`, 'utf8');
  return { jsonPath, mdPath };
}
