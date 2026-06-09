import { describe, expect, it } from 'vitest';
import { evaluateVpsCleanupEvent, vpsCleanupWebhookSchema } from '../vps-cleanup-webhook';

describe('vps cleanup webhook contract', () => {
  it('accepts the minimal safe cleanup event', () => {
    const parsed = vpsCleanupWebhookSchema.parse({
      source: 'discord',
      alert_type: 'vps_cleanup_request',
      severity: 'warning',
      vps: 'vps-dragon',
      service: 'docker',
      message: 'Limpieza en VPS',
      timestamp: '2026-06-05T10:00:00.000Z',
    });

    expect(parsed.requested_cleanup).toEqual([
      'logs',
      'images',
      'stopped_containers',
      'unused_networks',
    ]);
  });

  it('marks tenant-scoped or risky cleanup as approval required', () => {
    const evaluation = evaluateVpsCleanupEvent({
      source: 'n8n',
      alert_type: 'vps_cleanup_request',
      severity: 'warning',
      vps: 'vps-dragon',
      service: 'docker',
      tenant_slug: 'peskids',
      message: 'Cleanup request',
      timestamp: '2026-06-05T10:00:00.000Z',
      requested_cleanup: ['logs', 'volumes'],
    });

    expect(evaluation.decision).toBe('approval-required');
    expect(evaluation.approval_required).toBe(true);
    expect(evaluation.risky_actions).toContain('volumes');
  });
});
