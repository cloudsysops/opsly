#!/usr/bin/env npx tsx
/**
 * Discord Notifier Service — Phase 6 Autonomy
 *
 * Unified notification hub for orchestrator events:
 * - Service down/up alerts
 * - Queue depth warnings
 * - Worker health status
 * - Escalation alerts
 *
 * Features:
 * - Batch alerts every 1 minute to prevent spam
 * - Color coding: 🔴 down, 🟢 up, 🟡 warning/degraded
 * - Optional webhook (graceful if not set)
 * - Exponential backoff for webhook failures
 */

import * as https from 'https';
import * as http from 'http';

interface DiscordEmbed {
  title: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  footer?: {
    text: string;
  };
  timestamp?: string;
}

interface DiscordPayload {
  content?: string;
  embeds?: DiscordEmbed[];
  username?: string;
  avatar_url?: string;
}

interface AlertMessage {
  type: 'service_down' | 'service_up' | 'metrics' | 'escalation' | 'degraded';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  data?: Record<string, string | number | boolean>;
  timestamp: Date;
}

class DiscordNotifier {
  private webhook: string | null = null;
  private batchWindow = 60000; // 1 minute
  private batchQueue: AlertMessage[] = [];
  private isProcessing = false;
  private retryCount = 0;
  private maxRetries = 3;
  private backoffMs = [1000, 2000, 4000];

  constructor() {
    this.webhook = process.env.DISCORD_WEBHOOK_URL?.trim() || null;

    if (!this.webhook) {
      console.warn('[WARN] DISCORD_WEBHOOK_URL not set - notifications disabled');
    }
  }

  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    const timestamp = new Date().toISOString();
    const prefix = level === 'error' ? '[ERROR]' : level === 'warn' ? '[WARN]' : '[INFO]';
    console.log(`${timestamp} ${prefix} ${message}`);
  }

  /**
   * Add alert to batch queue
   */
  public queueAlert(alert: AlertMessage): void {
    this.batchQueue.push(alert);
    this.log(`Alert queued: ${alert.type} (queue size: ${this.batchQueue.length})`);

    // Start batch processing if not already running
    if (!this.isProcessing) {
      this.processBatch();
    }
  }

  /**
   * Process batched alerts every 1 minute
   */
  private async processBatch(): Promise<void> {
    if (this.isProcessing || this.batchQueue.length === 0) return;

    this.isProcessing = true;

    try {
      await new Promise((resolve) => setTimeout(resolve, this.batchWindow));

      if (this.batchQueue.length > 0) {
        const alerts = [...this.batchQueue];
        this.batchQueue = [];

        await this.sendBatchedAlerts(alerts);
      }
    } finally {
      this.isProcessing = false;

      // Continue processing if more alerts arrived
      if (this.batchQueue.length > 0) {
        this.processBatch();
      }
    }
  }

  /**
   * Send batched alerts as combined embed
   */
  private async sendBatchedAlerts(alerts: AlertMessage[]): Promise<void> {
    if (!this.webhook) {
      this.log('Discord webhook not configured, skipping notification', 'warn');
      return;
    }

    // Group alerts by severity
    const critical = alerts.filter((a) => a.severity === 'critical');
    const warnings = alerts.filter((a) => a.severity === 'warning');
    const infos = alerts.filter((a) => a.severity === 'info');

    const embeds: DiscordEmbed[] = [];

    // Critical alerts (highest priority)
    if (critical.length > 0) {
      embeds.push({
        title: `🔴 CRITICAL ALERTS (${critical.length})`,
        color: 0xff0000,
        fields: critical.map((a) => ({
          name: a.title,
          value: a.description,
          inline: false,
        })),
        timestamp: new Date().toISOString(),
      });
    }

    // Warning alerts
    if (warnings.length > 0) {
      embeds.push({
        title: `🟡 WARNINGS (${warnings.length})`,
        color: 0xffa500,
        fields: warnings.map((a) => ({
          name: a.title,
          value: a.description,
          inline: false,
        })),
        timestamp: new Date().toISOString(),
      });
    }

    // Info alerts
    if (infos.length > 0) {
      embeds.push({
        title: `🟢 INFO (${infos.length})`,
        color: 0x00ff00,
        fields: infos.map((a) => ({
          name: a.title,
          value: a.description,
          inline: false,
        })),
        timestamp: new Date().toISOString(),
      });
    }

    // Mention on escalation
    let content = '';
    if (critical.length > 0) {
      content = '@OpsAgent 🚨 Escalation required';
    }

    const payload: DiscordPayload = {
      content: content || undefined,
      embeds,
      username: 'Opsly Orchestrator Watchdog',
      avatar_url: 'https://github.com/cloudsysops/opsly/raw/main/docs/assets/logo.png',
    };

    await this.sendPayload(payload);
  }

  /**
   * Send Discord payload with retry logic
   */
  private async sendPayload(payload: DiscordPayload, attempt = 0): Promise<void> {
    if (!this.webhook) return;

    try {
      await this.postToDiscord(this.webhook, payload);
      this.retryCount = 0; // Reset retry counter on success
      this.log(`Discord notification sent (${payload.embeds?.length || 0} embeds)`);
    } catch (err) {
      if (attempt < this.maxRetries) {
        const backoffMs = this.backoffMs[attempt] || 4000;
        this.log(
          `Discord send failed: ${err instanceof Error ? err.message : String(err)}, retrying in ${backoffMs}ms`,
          'warn'
        );
        await new Promise((resolve) => setTimeout(resolve, backoffMs));
        await this.sendPayload(payload, attempt + 1);
      } else {
        this.log(`Discord notification failed after ${this.maxRetries} retries`, 'error');
      }
    }
  }

  /**
   * Post to Discord webhook
   */
  private async postToDiscord(webhook: string, payload: DiscordPayload): Promise<void> {
    return new Promise((resolve, reject) => {
      const url = new URL(webhook);
      const protocol = url.protocol === 'https:' ? https : http;

      const postData = JSON.stringify(payload);

      const req = protocol.request(
        {
          hostname: url.hostname,
          port: url.port || (url.protocol === 'https:' ? 443 : 80),
          path: url.pathname + url.search,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(postData),
          },
          timeout: 5000,
        },
        (res) => {
          if (res.statusCode === 204 || res.statusCode === 200) {
            resolve();
          } else {
            reject(new Error(`Discord webhook returned ${res.statusCode}`));
          }
        }
      );

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Discord webhook timeout'));
      });

      req.on('error', (err) => {
        reject(err);
      });

      req.write(postData);
      req.end();
    });
  }

  /**
   * Notify service is down
   */
  public notifyServiceDown(serviceName: string, reason: string, details?: Record<string, string | number>): void {
    const description = `**Service:** ${serviceName}\n**Reason:** ${reason}${
      details ? '\n**Details:**\n' + Object.entries(details).map(([k, v]) => `• ${k}: ${v}`).join('\n') : ''
    }`;

    this.queueAlert({
      type: 'service_down',
      severity: 'critical',
      title: `🔴 ${serviceName} Down`,
      description,
      data: details,
      timestamp: new Date(),
    });
  }

  /**
   * Notify service is up
   */
  public notifyServiceUp(serviceName: string, details?: Record<string, string | number>): void {
    const description = `**Service:** ${serviceName}\n**Status:** Online and responsive${
      details ? '\n**Details:**\n' + Object.entries(details).map(([k, v]) => `• ${k}: ${v}`).join('\n') : ''
    }`;

    this.queueAlert({
      type: 'service_up',
      severity: 'info',
      title: `🟢 ${serviceName} Up`,
      description,
      data: details,
      timestamp: new Date(),
    });
  }

  /**
   * Notify degraded status
   */
  public notifyDegraded(serviceName: string, reason: string, details?: Record<string, string | number>): void {
    const description = `**Service:** ${serviceName}\n**Status:** Degraded\n**Reason:** ${reason}${
      details ? '\n**Details:**\n' + Object.entries(details).map(([k, v]) => `• ${k}: ${v}`).join('\n') : ''
    }`;

    this.queueAlert({
      type: 'degraded',
      severity: 'warning',
      title: `🟡 ${serviceName} Degraded`,
      description,
      data: details,
      timestamp: new Date(),
    });
  }

  /**
   * Notify queue metrics
   */
  public notifyMetrics(metrics: Record<string, number>): void {
    const fields = Object.entries(metrics)
      .map(([name, value]) => `• ${name}: ${value}`)
      .join('\n');

    this.queueAlert({
      type: 'metrics',
      severity: 'info',
      title: '📊 Queue Metrics Update',
      description: `**Current Queue Sizes:**\n${fields}`,
      data: metrics as Record<string, string | number>,
      timestamp: new Date(),
    });
  }

  /**
   * Notify escalation event
   */
  public notifyEscalation(
    title: string,
    reason: string,
    recommendedAction: string,
    details?: Record<string, string | number>
  ): void {
    const description =
      `**Incident:** ${title}\n**Reason:** ${reason}\n**Recommended Action:** ${recommendedAction}` +
      (details ? '\n**Details:**\n' + Object.entries(details).map(([k, v]) => `• ${k}: ${v}`).join('\n') : '');

    this.queueAlert({
      type: 'escalation',
      severity: 'critical',
      title: `🚨 ${title}`,
      description,
      data: details,
      timestamp: new Date(),
    });
  }

  /**
   * Check if webhook is configured
   */
  public isConfigured(): boolean {
    return !!this.webhook;
  }

  /**
   * Get current queue size
   */
  public getQueueSize(): number {
    return this.batchQueue.length;
  }
}

// Export singleton instance
export const notifier = new DiscordNotifier();

// CLI support
async function main(): Promise<void> {
  const [command, ...args] = process.argv.slice(2);

  const n = new DiscordNotifier();

  if (!n.isConfigured()) {
    console.log('Discord notifier: webhook not configured, command skipped');
    process.exit(0);
  }

  switch (command) {
    case 'down':
      n.notifyServiceDown(args[0] || 'Unknown', args[1] || 'No reason provided');
      break;

    case 'up':
      n.notifyServiceUp(args[0] || 'Unknown');
      break;

    case 'degraded':
      n.notifyDegraded(args[0] || 'Unknown', args[1] || 'No reason provided');
      break;

    case 'metrics':
      if (args[0]) {
        const metrics = JSON.parse(args[0]) as Record<string, number>;
        n.notifyMetrics(metrics);
      }
      break;

    case 'escalation':
      n.notifyEscalation(args[0] || 'Escalation', args[1] || 'Unknown', args[2] || 'Manual intervention required');
      break;

    default:
      console.log('Usage: discord-notifier.ts <command> [args]');
      console.log('Commands:');
      console.log('  down <service> <reason>');
      console.log('  up <service>');
      console.log('  degraded <service> <reason>');
      console.log('  metrics <json>');
      console.log('  escalation <title> <reason> <action>');
      process.exit(1);
  }

  // Allow time for batched alerts to process
  await new Promise((resolve) => setTimeout(resolve, 2000));
}

main().catch((err) => {
  console.error(`Discord notifier error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
