import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../orchestrator', () => ({
  suspendTenant: vi.fn(),
}));

import * as orchestrator from '../../orchestrator';

const TENANT_ID = '550e8400-e29b-41d4-a716-446655440099';
const TENANT_SLUG = 'acme-corp';
const TENANT_2_ID = '660e8400-e29b-41d4-a716-4466554400aa';
const TENANT_2_SLUG = 'other-corp';

function countDiscordCalls(): number {
  return vi.mocked(fetch).mock.calls.length;
}

function discordBodyAt(index: number): string {
  const call = vi.mocked(fetch).mock.calls[index];
  if (!call) return '';
  const body = (call[1] as RequestInit).body;
  return typeof body === 'string' ? body : '';
}

describe('DunningService', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let svc: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    process.env.DISCORD_WEBHOOK_URL = 'https://discord.example.com';
    const mod = await import('../dunning-service');
    svc = mod.getDunningService();
    await svc.clearFailures(TENANT_ID);
    await svc.clearFailures(TENANT_2_ID);
  });

  afterEach(() => {
    delete process.env.DISCORD_WEBHOOK_URL;
    vi.unstubAllGlobals();
  });

  describe('recordPaymentFailure', () => {
    it('tracks failure count from 1st to 5th failure', async () => {
      for (let i = 1; i <= 5; i++) {
        await svc.recordPaymentFailure(TENANT_ID, TENANT_SLUG);
        const status = await svc.getDunningStatus(TENANT_ID);
        expect(status.failureCount).toBe(i);
      }
    });

    it('sends Discord alert on 1st failure', async () => {
      await svc.recordPaymentFailure(TENANT_ID, TENANT_SLUG);

      expect(countDiscordCalls()).toBe(1);
      expect(discordBodyAt(0)).toContain('Dunning');
      expect(discordBodyAt(0)).toContain(TENANT_SLUG);
    });

    it('sends Discord escalation alert on 3rd failure', async () => {
      for (let i = 0; i < 3; i++) {
        await svc.recordPaymentFailure(TENANT_ID, TENANT_SLUG);
      }

      const escalationIdx = Array.from({ length: countDiscordCalls() }).findIndex((_, i) =>
        discordBodyAt(i).includes('escalated')
      );
      expect(escalationIdx).toBeGreaterThanOrEqual(0);
    });

    it('suspends tenant and sends suspended notification on 5th failure', async () => {
      for (let i = 0; i < 5; i++) {
        await svc.recordPaymentFailure(TENANT_ID, TENANT_SLUG);
      }

      const suspendedNotifs = Array.from({ length: countDiscordCalls() }).filter((_, i) =>
        discordBodyAt(i).includes('suspended')
      );
      expect(suspendedNotifs.length).toBe(2);
      expect(orchestrator.suspendTenant).toHaveBeenCalledWith(TENANT_ID, 'dunning-service');
    });

    it('does not send duplicate level notifications on non-escalation failures', async () => {
      await svc.recordPaymentFailure(TENANT_ID, TENANT_SLUG);
      await svc.recordPaymentFailure(TENANT_ID, TENANT_SLUG);

      expect(countDiscordCalls()).toBe(1);
    });

    it('sends 4 notifications total for 5 failures (1, 3, 5-level, 5-suspend)', async () => {
      for (let i = 0; i < 5; i++) {
        await svc.recordPaymentFailure(TENANT_ID, TENANT_SLUG);
      }

      expect(countDiscordCalls()).toBe(4);
    });

    it('does not send Discord when webhook URL is not configured', async () => {
      vi.resetModules();
      vi.clearAllMocks();
      vi.stubGlobal('fetch', vi.fn());
      delete process.env.DISCORD_WEBHOOK_URL;

      const mod = await import('../dunning-service');
      const freshSvc = mod.getDunningService();
      await freshSvc.clearFailures(TENANT_ID);

      for (let i = 0; i < 5; i++) {
        await freshSvc.recordPaymentFailure(TENANT_ID, TENANT_SLUG);
      }

      expect(countDiscordCalls()).toBe(0);
      expect(orchestrator.suspendTenant).toHaveBeenCalledWith(TENANT_ID, 'dunning-service');
    });

    it('handles Discord fetch error gracefully without crashing', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Discord unreachable'));

      await expect(svc.recordPaymentFailure(TENANT_ID, TENANT_SLUG)).resolves.toBeUndefined();
    });
  });

  describe('getDunningStatus', () => {
    it('returns none level when no failures recorded', async () => {
      const status = await svc.getDunningStatus(TENANT_ID);

      expect(status.failureCount).toBe(0);
      expect(status.shouldSuspend).toBe(false);
      expect(status.level).toBe('none');
      expect(status.message).toBe('No payment failures');
    });

    it('returns warning level after 1 failure', async () => {
      await svc.recordPaymentFailure(TENANT_ID, TENANT_SLUG);
      const status = await svc.getDunningStatus(TENANT_ID);

      expect(status.level).toBe('warning');
      expect(status.shouldSuspend).toBe(false);
    });

    it('returns escalated level after 3 failures', async () => {
      for (let i = 0; i < 3; i++) {
        await svc.recordPaymentFailure(TENANT_ID, TENANT_SLUG);
      }
      const status = await svc.getDunningStatus(TENANT_ID);

      expect(status.level).toBe('escalated');
      expect(status.shouldSuspend).toBe(false);
    });

    it('returns suspended level after 5 failures', async () => {
      for (let i = 0; i < 5; i++) {
        await svc.recordPaymentFailure(TENANT_ID, TENANT_SLUG);
      }
      const status = await svc.getDunningStatus(TENANT_ID);

      expect(status.level).toBe('suspended');
      expect(status.shouldSuspend).toBe(true);
    });
  });

  describe('clearFailures', () => {
    it('resets failure count on payment success', async () => {
      await svc.recordPaymentFailure(TENANT_ID, TENANT_SLUG);
      expect((await svc.getDunningStatus(TENANT_ID)).failureCount).toBe(1);

      await svc.clearFailures(TENANT_ID);

      const status = await svc.getDunningStatus(TENANT_ID);
      expect(status.failureCount).toBe(0);
      expect(status.level).toBe('none');
    });

    it('allows retracking after cleared failures', async () => {
      for (let i = 0; i < 3; i++) {
        await svc.recordPaymentFailure(TENANT_ID, TENANT_SLUG);
      }
      expect((await svc.getDunningStatus(TENANT_ID)).failureCount).toBe(3);

      await svc.clearFailures(TENANT_ID);
      await svc.recordPaymentFailure(TENANT_ID, TENANT_SLUG);

      expect((await svc.getDunningStatus(TENANT_ID)).failureCount).toBe(1);
    });
  });

  describe('getStatsForAdmin', () => {
    it('returns zero stats when no tenants tracked', async () => {
      const stats = await svc.getStatsForAdmin();

      expect(stats.total).toBe(0);
      expect(stats.suspended).toBe(0);
      expect(stats.escalated).toBe(0);
    });

    it('counts escalated and suspended tenants correctly', async () => {
      for (let i = 0; i < 3; i++) {
        await svc.recordPaymentFailure(TENANT_ID, TENANT_SLUG);
      }
      for (let i = 0; i < 5; i++) {
        await svc.recordPaymentFailure(TENANT_2_ID, TENANT_2_SLUG);
      }

      const stats = await svc.getStatsForAdmin();

      expect(stats.total).toBe(2);
      expect(stats.escalated).toBe(1);
      expect(stats.suspended).toBe(1);
    });

    it('excludes warning-only tenants from escalated count', async () => {
      await svc.recordPaymentFailure(TENANT_ID, TENANT_SLUG);

      const stats = await svc.getStatsForAdmin();

      expect(stats.total).toBe(1);
      expect(stats.escalated).toBe(0);
      expect(stats.suspended).toBe(0);
    });
  });
});
