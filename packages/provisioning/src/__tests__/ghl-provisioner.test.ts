import { describe, expect, it, vi } from 'vitest';
import { GhlProvisioningAgent } from '../ghl-provisioner.js';
import type { TenantProvisionManifest } from '../types.js';
import { validateManifest } from '../types.js';

const sampleManifest: TenantProvisionManifest = {
  tenantName: 'Peskids',
  tenantSlug: 'peskids',
  industry: 'swim-academy',
  tags: [{ name: 'lead-web' }, { name: 'trial-booked' }],
  customFields: [
    { name: 'child_name', dataType: 'TEXT', model: 'contact' },
  ],
  emailTemplates: [{ name: 'Welcome Parent', subject: 'Welcome' }],
  smsTemplates: [{ name: 'Trial Reminder', body: 'Hi!' }],
  forms: [{ name: 'Lead Capture', fields: [{ name: 'email', required: true }] }],
  pipelines: [
    {
      name: 'Enrollment',
      stages: ['New Lead', 'Trial Class', 'Enrolled'],
    },
  ],
  calendars: [{ name: 'Trial Class Calendar', slug: 'trial-class' }],
};

function createMockClient(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    listTags: vi.fn().mockResolvedValue([]),
    createTag: vi.fn().mockResolvedValue({ id: 'tag-1', name: 'lead-web' }),
    listCustomFields: vi.fn().mockResolvedValue([]),
    createCustomField: vi.fn().mockResolvedValue({ id: 'cf-1', name: 'child_name' }),
    listForms: vi.fn().mockResolvedValue([]),
    createForm: vi.fn().mockResolvedValue({ id: 'form-1', name: 'Lead Capture' }),
    listPipelines: vi.fn().mockResolvedValue([
      {
        id: 'pipe-1',
        name: 'Enrollment',
        stages: [
          { id: 's1', name: 'New Lead' },
          { id: 's2', name: 'Trial Class' },
          { id: 's3', name: 'Enrolled' },
        ],
      },
    ]),
    listCalendars: vi.fn().mockResolvedValue([
      { id: 'cal-1', name: 'Trial Class Calendar', slug: 'trial-class' },
    ]),
    createCalendar: vi.fn().mockResolvedValue({ id: 'cal-new', name: 'Trial Class Calendar' }),
    createEventCalendarSchedule: vi.fn().mockResolvedValue({ id: 'sched-1' }),
    ...overrides,
  } as unknown as import('@intcloudsysops/services/gohighlevel/index.js').GoHighLevelClient;
}

describe('validateManifest', () => {
  it('accepts a valid manifest', () => {
    expect(validateManifest(sampleManifest).tenantSlug).toBe('peskids');
  });

  it('rejects invalid slug', () => {
    expect(() =>
      validateManifest({ ...sampleManifest, tenantSlug: 'Bad Slug' })
    ).toThrow();
  });
});

describe('GhlProvisioningAgent dry run', () => {
  it('plans tags and fields without writes', async () => {
    const client = createMockClient();
    const agent = new GhlProvisioningAgent(client, sampleManifest, {
      dryRun: true,
      locationId: 'loc-test',
    });

    const report = await agent.run();

    expect(report.dryRun).toBe(true);
    expect(client.createTag).not.toHaveBeenCalled();
    expect(client.createCustomField).not.toHaveBeenCalled();
    expect(report.summary.wouldCreate).toBeGreaterThan(0);
    expect(report.summary.manualRequired).toBeGreaterThan(0);
  });
});

describe('GhlProvisioningAgent idempotency', () => {
  it('skips existing tags on execute', async () => {
    const client = createMockClient({
      listTags: vi.fn().mockResolvedValue([{ id: 't1', name: 'lead-web' }]),
    });
    const agent = new GhlProvisioningAgent(client, sampleManifest, {
      dryRun: false,
      locationId: 'loc-test',
    });

    const report = await agent.run();
    const leadWeb = report.items.find((item) => item.name === 'lead-web');

    expect(leadWeb?.status).toBe('already_exists');
    expect(client.createTag).toHaveBeenCalledTimes(1);
    expect(client.createTag).toHaveBeenCalledWith({ name: 'trial-booked' });
  });
});
