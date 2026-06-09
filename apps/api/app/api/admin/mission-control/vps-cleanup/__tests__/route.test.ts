import { beforeEach, describe, expect, it, vi } from 'vitest';
import { POST } from '../route';

vi.mock('../../../../../../lib/auth', () => ({
  requireAdminAccess: vi.fn(),
}));

vi.mock('../../../../../../lib/vps-cleanup-webhook', () => ({
  cleanupWebhookSecret: vi.fn(),
  evaluateVpsCleanupEvent: vi.fn(),
  vpsCleanupWebhookSchema: {
    safeParse: vi.fn(),
  },
}));

import { requireAdminAccess } from '../../../../../../lib/auth';
import {
  cleanupWebhookSecret,
  evaluateVpsCleanupEvent,
  vpsCleanupWebhookSchema,
} from '../../../../../../lib/vps-cleanup-webhook';

describe('POST /api/admin/mission-control/vps-cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdminAccess).mockResolvedValue(
      Response.json({ error: 'forbidden' }, { status: 403 }) as never
    );
    vi.mocked(cleanupWebhookSecret).mockReturnValue('secret');
    vi.mocked(vpsCleanupWebhookSchema.safeParse).mockReturnValue({
      success: true,
      data: {
        source: 'discord',
        alert_type: 'vps_cleanup_request',
        severity: 'warning',
        vps: 'vps-dragon',
        service: 'docker',
        tenant_slug: null,
        message: 'Limpieza en VPS',
        timestamp: '2026-06-05T10:00:00.000Z',
        requested_cleanup: ['logs', 'images'],
      },
    } as never);
    vi.mocked(evaluateVpsCleanupEvent).mockReturnValue({
      decision: 'safe-auto',
      approval_required: false,
      safe_actions: ['logs', 'images'],
      risky_actions: [],
      suggestions: [
        {
          label: 'Rotate old logs',
          command: "find /opt/opsly/runtime/logs -type f -name '*.log' -mtime +7 -delete",
          reversible: false,
        },
      ],
      rationale: ['only reversible host-level cleanup requested'],
    } as never);
  });

  it('rejects missing webhook secret', async () => {
    const res = await POST(
      new Request('http://localhost/api/admin/mission-control/vps-cleanup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({}),
      })
    );
    expect(res.status).toBe(403);
  });

  it('returns a safe cleanup decision when the webhook is valid', async () => {
    const res = await POST(
      new Request('http://localhost/api/admin/mission-control/vps-cleanup', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-opsly-webhook-secret': 'secret',
        },
        body: JSON.stringify({
          source: 'discord',
          alert_type: 'vps_cleanup_request',
          severity: 'warning',
          vps: 'vps-dragon',
          service: 'docker',
          message: 'Limpieza en VPS',
          timestamp: '2026-06-05T10:00:00.000Z',
        }),
      })
    );

    expect(res.status).toBe(202);
    const body = (await res.json()) as { auto_execute: boolean; next_action: string };
    expect(body.auto_execute).toBe(true);
    expect(body.next_action).toContain('automatically');
  });
});
