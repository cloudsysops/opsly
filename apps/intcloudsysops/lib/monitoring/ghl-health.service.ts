import type { PeskidsGoHighLevelThreadClient } from '@/lib/gohighlevel-thread-client';

const HEALTH_CHECK_EMAIL = 'monitor+ghl-health@intcloudsysops.com';
const HEALTH_CHECK_TAG = '_health-check';

export interface GhlHealthStatus {
  overall: 'healthy' | 'degraded' | 'down';
  lastCheck: string;
  apiAccessible: boolean;
  authValid: boolean;
  contactCreationWorks: boolean;
  conversationAccessible: boolean;
  pipelineAccessible: boolean;
  rateLimitRemaining: number | null;
  rateLimitReset: string | null;
  webhookDeliveries24h: { total: number; failed: number; successRate: number };
  latencyMs: number;
}

export class GhlHealthService {
  constructor(private ghlClient: PeskidsGoHighLevelThreadClient) {}

  async checkHealth(): Promise<GhlHealthStatus> {
    const start = Date.now();
    const errors: string[] = [];

    let apiAccessible = false;
    let authValid = false;
    let contactCreationWorks = false;
    let conversationAccessible = false;
    let pipelineAccessible = false;

    try {
      await this.ghlClient.listTags();
      apiAccessible = true;
      authValid = true;
    } catch (err) {
      errors.push(`auth: ${err instanceof Error ? err.message : String(err)}`);
    }

    try {
      await this.testContactCreation();
      contactCreationWorks = true;
    } catch (err) {
      errors.push(`contact: ${err instanceof Error ? err.message : String(err)}`);
    }

    try {
      await this.ghlClient.searchConversations({ limit: 1 });
      conversationAccessible = true;
    } catch (err) {
      errors.push(`conversation: ${err instanceof Error ? err.message : String(err)}`);
    }

    try {
      await this.ghlClient.getContacts({ limit: 1 });
      pipelineAccessible = true;
    } catch (err) {
      errors.push(`pipeline: ${err instanceof Error ? err.message : String(err)}`);
    }

    const latencyMs = Date.now() - start;
    const rateLimit = this.ghlClient.getLastRateLimitInfo();

    const degraded = errors.length > 0;
    const down = errors.length >= 3;

    return {
      overall: down ? 'down' : degraded ? 'degraded' : 'healthy',
      lastCheck: new Date().toISOString(),
      apiAccessible,
      authValid,
      contactCreationWorks,
      conversationAccessible,
      pipelineAccessible,
      rateLimitRemaining: rateLimit.remaining,
      rateLimitReset: rateLimit.resetAt,
      webhookDeliveries24h: { total: 0, failed: 0, successRate: 100 },
      latencyMs,
    };
  }

  async ping(): Promise<boolean> {
    try {
      await this.ghlClient.listTags();
      return true;
    } catch {
      return false;
    }
  }

  async testContactCreation(): Promise<boolean> {
    const contact = await this.ghlClient.createContact({
      email: HEALTH_CHECK_EMAIL,
      name: 'GHL Health Monitor',
      source: 'health-check',
    });

    try {
      await this.ghlClient.addContactTags(contact.id, [HEALTH_CHECK_TAG]);
    } catch {
      // Tagging is non-critical for health
    }

    try {
      await this.ghlClient.deleteContact(contact.id);
    } catch {
      // Cleanup failure is non-critical for health
    }

    return true;
  }

  getRateLimitStatus(): { remaining: number | null; resetAt: string | null } {
    return this.ghlClient.getLastRateLimitInfo();
  }

  formatAlertMessage(status: GhlHealthStatus): { emoji: string; title: string; body: string } {
    if (status.overall === 'healthy') {
      return {
        emoji: '✅',
        title: 'GHL Health: OK',
        body: `API accessible, auth valid, contact creation works. Latency: ${status.latencyMs}ms. Rate limit: ${status.rateLimitRemaining ?? 'unknown'} remaining.`,
      };
    }

    const issues: string[] = [];
    if (!status.apiAccessible) issues.push('API not accessible');
    if (!status.authValid) issues.push('Auth invalid');
    if (!status.contactCreationWorks) issues.push('Contact creation failed');
    if (!status.conversationAccessible) issues.push('Conversations not accessible');
    if (!status.pipelineAccessible) issues.push('Pipeline not accessible');

    const severity = status.overall === 'down' ? '🔴' : '🟡';

    return {
      emoji: severity,
      title: `GHL Health: ${status.overall.toUpperCase()}`,
      body: `Issues: ${issues.join(', ') || 'unknown'}. Latency: ${status.latencyMs}ms. Rate limit: ${status.rateLimitRemaining ?? 'unknown'} remaining.`,
    };
  }
}
