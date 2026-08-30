/**
 * Dunning Service — tracks payment failure escalation per tenant.
 *
 * Primary store: Redis (TTL 30 days). Fallback: in-memory Map when Redis unavailable.
 */

import { logger } from '../logger';
import { suspendTenant } from '../orchestrator';
import { getRedisClient } from '../redis-cache';

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
const TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const KEY_PREFIX = 'dunning:';

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

function redisKey(tenantId: string): string {
  return `${KEY_PREFIX}${tenantId}`;
}

class DunningService {
  private fallback = new Map<string, DunningEntry>();

  private async loadEntry(tenantId: string): Promise<DunningEntry | null> {
    const redis = await getRedisClient();
    if (redis) {
      try {
        const raw = await redis.get(redisKey(tenantId));
        if (raw) return JSON.parse(raw) as DunningEntry;
      } catch (e) {
        logger.error('dunning.redis.load', e instanceof Error ? e : { error: String(e) });
      }
    }
    return this.fallback.get(tenantId) ?? null;
  }

  private async saveEntry(tenantId: string, entry: DunningEntry): Promise<void> {
    const redis = await getRedisClient();
    if (redis) {
      try {
        await redis.set(redisKey(tenantId), JSON.stringify(entry), { EX: TTL_SECONDS });
      } catch (e) {
        logger.error('dunning.redis.save', e instanceof Error ? e : { error: String(e) });
      }
    }
    this.fallback.set(tenantId, entry);
  }

  private async deleteEntry(tenantId: string): Promise<void> {
    const redis = await getRedisClient();
    if (redis) {
      try {
        await redis.del(redisKey(tenantId));
      } catch (e) {
        logger.error('dunning.redis.del', e instanceof Error ? e : { error: String(e) });
      }
    }
    this.fallback.delete(tenantId);
  }

  async recordPaymentFailure(tenantId: string, slug: string): Promise<void> {
    const now = Date.now();
    const existing = await this.loadEntry(tenantId);

    let entry: DunningEntry;

    if (existing) {
      entry = {
        ...existing,
        failureCount: existing.failureCount + 1,
        lastFailureAt: now,
      };

      const level = resolveLevel(entry.failureCount);

      if (
        shouldNotify(entry, entry.failureCount) &&
        NOTIFICATION_LEVELS.includes(entry.failureCount as (typeof NOTIFICATION_LEVELS)[number])
      ) {
        entry.lastNotificationLevel = entry.failureCount;
        const msg = buildMessage(slug, entry.failureCount, level);
        await postDiscord(msg);
        logger.info('dunning.notification', {
          tenantId,
          slug,
          failureCount: entry.failureCount,
          level,
        });
      }

      if (entry.failureCount >= SUSPEND_AFTER_FAILURES) {
        try {
          await suspendTenant(tenantId, 'dunning-service');
          entry.lastNotificationLevel = entry.failureCount;
          const msg = buildMessage(slug, entry.failureCount, 'suspended');
          await postDiscord(msg);
          logger.info('dunning.suspended', { tenantId, slug, failureCount: entry.failureCount });
        } catch (e) {
          logger.error('dunning.suspend.failed', e instanceof Error ? e : { error: String(e) });
        }
      }
    } else {
      entry = {
        failureCount: 1,
        firstFailureAt: now,
        lastFailureAt: now,
        lastNotificationLevel: 1,
      };

      const msg = buildMessage(slug, 1, 'warning');
      await postDiscord(msg);
      logger.info('dunning.first_failure', { tenantId, slug });
    }

    await this.saveEntry(tenantId, entry);
  }

  async getDunningStatus(tenantId: string): Promise<DunningStatus> {
    const entry = await this.loadEntry(tenantId);
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

  async clearFailures(tenantId: string): Promise<void> {
    await this.deleteEntry(tenantId);
    logger.info('dunning.cleared', { tenantId });
  }

  async getStatsForAdmin(): Promise<{ total: number; suspended: number; escalated: number }> {
    let suspended = 0;
    let escalated = 0;
    let total = 0;

    // Check Redis first for all dunning keys
    const redis = await getRedisClient();
    if (redis) {
      try {
        let cursor = 0;
        do {
          const result = await redis.scan(cursor, { MATCH: `${KEY_PREFIX}*`, COUNT: 100 });
          cursor = result.cursor;
          for (const key of result.keys) {
            total++;
            const raw = await redis.get(key);
            if (raw) {
              const entry = JSON.parse(raw) as DunningEntry;
              if (entry.failureCount >= SUSPEND_AFTER_FAILURES) suspended++;
              else if (entry.failureCount >= 3) escalated++;
            }
          }
        } while (cursor !== 0);
        return { total, suspended, escalated };
      } catch (e) {
        logger.error('dunning.redis.scan', e instanceof Error ? e : { error: String(e) });
      }
    }

    // Fallback to in-memory
    for (const entry of this.fallback.values()) {
      total++;
      if (entry.failureCount >= SUSPEND_AFTER_FAILURES) suspended++;
      else if (entry.failureCount >= 3) escalated++;
    }
    return { total, suspended, escalated };
  }
}

let instance: DunningService | null = null;

export function getDunningService(): DunningService {
  if (!instance) {
    instance = new DunningService();
  }
  return instance;
}
