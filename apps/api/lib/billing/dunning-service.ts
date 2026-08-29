/**
 * Dunning Service — tracks payment failure escalation per tenant.
 *
 * MVP: in-memory Map with TTL. Future: persist to Redis or DB.
 */

import { logger } from '../logger';
import { suspendTenant } from '../orchestrator';

interface DunningEntry {
  failureCount: number;
  firstFailureAt: number;
  lastFailureAt: number;
  lastNotificationLevel: number;
}

interface DunningStatus {
  failureCount: number;
  shouldSuspend: boolean;
  level: 'none' | 'warning' | 'escalated' | 'critical' | 'suspended';
  message: string;
}

const SUSPEND_AFTER_FAILURES = 5;
const NOTIFICATION_LEVELS = [1, 3, 5] as const;
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let webhookUrl: string | null = null;

function getWebhookUrl(): string | null {
  if (webhookUrl === null) {
    const url = process.env.DISCORD_WEBHOOK_URL;
    webhookUrl = url && url.length > 0 ? url : null;
  }
  return webhookUrl;
}

async function postDiscord(content: string): Promise<void> {
  const wh = getWebhookUrl();
  if (!wh) return;
  try {
    await fetch(wh, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  } catch {
    // Non-blocking
  }
}

function shouldNotify(entry: DunningEntry, level: number): boolean {
  return entry.lastNotificationLevel < level;
}

function resolveLevel(failureCount: number): DunningStatus['level'] {
  if (failureCount >= SUSPEND_AFTER_FAILURES) return 'suspended';
  if (failureCount >= 5) return 'critical';
  if (failureCount >= 3) return 'escalated';
  if (failureCount >= 1) return 'warning';
  return 'none';
}

function buildMessage(slug: string, count: number, level: DunningStatus['level']): string {
  const emoji =
    level === 'suspended'
      ? '🚨'
      : level === 'critical'
        ? '🔴'
        : level === 'escalated'
          ? '🟡'
          : '🟢';
  return `**${emoji} Dunning** — tenant \`${slug}\` — ${count} failed payment(s) — ${level}`;
}

class DunningService {
  private store = new Map<string, DunningEntry>();

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now - entry.lastFailureAt > TTL_MS) {
        this.store.delete(key);
      }
    }
  }

  async recordPaymentFailure(tenantId: string, slug: string): Promise<void> {
    const now = Date.now();
    const existing = this.store.get(tenantId);

    if (existing) {
      existing.failureCount += 1;
      existing.lastFailureAt = now;

      const level = resolveLevel(existing.failureCount);

      if (
        shouldNotify(existing, existing.failureCount) &&
        NOTIFICATION_LEVELS.includes(existing.failureCount as (typeof NOTIFICATION_LEVELS)[number])
      ) {
        existing.lastNotificationLevel = existing.failureCount;
        const msg = buildMessage(slug, existing.failureCount, level);
        await postDiscord(msg);
        logger.info('dunning.notification', {
          tenantId,
          slug,
          failureCount: existing.failureCount,
          level,
        });
      }

      if (existing.failureCount >= SUSPEND_AFTER_FAILURES) {
        try {
          await suspendTenant(tenantId, 'dunning-service');
          existing.lastNotificationLevel = existing.failureCount;
          const msg = buildMessage(slug, existing.failureCount, 'suspended');
          await postDiscord(msg);
          logger.info('dunning.suspended', { tenantId, slug, failureCount: existing.failureCount });
        } catch (e) {
          logger.error('dunning.suspend.failed', e instanceof Error ? e : { error: String(e) });
        }
      }
    } else {
      this.store.set(tenantId, {
        failureCount: 1,
        firstFailureAt: now,
        lastFailureAt: now,
        lastNotificationLevel: 1,
      });

      const msg = buildMessage(slug, 1, 'warning');
      await postDiscord(msg);
      logger.info('dunning.first_failure', { tenantId, slug });
    }

    this.cleanup();
  }

  getDunningStatus(tenantId: string): DunningStatus {
    const entry = this.store.get(tenantId);
    if (!entry) {
      return {
        failureCount: 0,
        shouldSuspend: false,
        level: 'none',
        message: 'No payment failures',
      };
    }

    const level = resolveLevel(entry.failureCount);
    return {
      failureCount: entry.failureCount,
      shouldSuspend: entry.failureCount >= SUSPEND_AFTER_FAILURES,
      level,
      message: buildMessage('unknown', entry.failureCount, level).replace(/`[^`]+` — /, ''),
    };
  }

  clearFailures(tenantId: string): void {
    this.store.delete(tenantId);
    logger.info('dunning.cleared', { tenantId });
  }

  getStatsForAdmin(): { total: number; suspended: number; escalated: number } {
    let suspended = 0;
    let escalated = 0;
    for (const entry of this.store.values()) {
      if (entry.failureCount >= SUSPEND_AFTER_FAILURES) suspended++;
      else if (entry.failureCount >= 3) escalated++;
    }
    return { total: this.store.size, suspended, escalated };
  }
}

let instance: DunningService | null = null;

export function getDunningService(): DunningService {
  if (!instance) {
    instance = new DunningService();
  }
  return instance;
}
