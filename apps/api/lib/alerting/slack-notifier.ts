/**
 * Slack alerting for critical operational events.
 * Sends structured messages to #opsly-alerts channel for visibility into failures.
 */

export type AlertSeverity = 'critical' | 'warning' | 'info';

export interface AlertContext {
  service: string;
  component: string;
  operation: string;
  error?: string;
  leadId?: string;
  tenantSlug?: string;
  context?: Record<string, unknown>;
}

const COLORS: Record<AlertSeverity, string> = {
  critical: '#FF0000', // Red
  warning: '#FFAA00', // Orange
  info: '#0099FF', // Blue
};

export async function sendSlackAlert(
  severity: AlertSeverity,
  context: AlertContext
): Promise<void> {
  const webhook = process.env.SLACK_ALERT_WEBHOOK_URL?.trim();

  if (!webhook) {
    // Webhook not configured; log locally as fallback
    console.warn('[slack-alerter] SLACK_ALERT_WEBHOOK_URL not set; alert not sent', {
      severity,
      service: context.service,
      component: context.component,
      error: context.error,
    });
    return;
  }

  try {
    const timestamp = new Date().toISOString();
    const title = `${context.service}/${context.component}`;
    const description = `${context.operation}: ${context.error || 'Unknown error'}`;

    const fields = [
      { name: 'Service', value: context.service, short: true },
      { name: 'Component', value: context.component, short: true },
      { name: 'Operation', value: context.operation, short: true },
      { name: 'Severity', value: severity.toUpperCase(), short: true },
    ];

    if (context.leadId) {
      fields.push({ name: 'Lead ID', value: context.leadId, short: true });
    }

    if (context.tenantSlug) {
      fields.push({ name: 'Tenant', value: context.tenantSlug, short: true });
    }

    if (context.context) {
      fields.push({ name: 'Context', value: JSON.stringify(context.context), short: false });
    }

    const payload = {
      attachments: [
        {
          fallback: title,
          color: COLORS[severity],
          title,
          text: description,
          fields,
          ts: Math.floor(new Date(timestamp).getTime() / 1000),
          footer: 'Opsly Reliability · Critical Alerts',
        },
      ],
    };

    const response = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      console.error('[slack-alerter] Webhook returned non-OK status:', response.status);
    }
  } catch (err) {
    // Don't throw; alerting failure shouldn't break the request
    console.error('[slack-alerter] Failed to send alert:', err instanceof Error ? err.message : String(err));
  }
}

/**
 * Alert helpers for common scenarios
 */

export async function alertSubabaseFailure(
  operation: string,
  error: unknown,
  context?: Record<string, unknown>
): Promise<void> {
  return sendSlackAlert('critical', {
    service: 'peskids',
    component: 'supabase',
    operation,
    error: error instanceof Error ? error.message : String(error),
    context,
  });
}

export async function alertGhlFailure(
  operation: string,
  statusCode?: number,
  error?: string,
  leadId?: string
): Promise<void> {
  const errorMsg = error || (statusCode ? `HTTP ${statusCode}` : 'Unknown error');
  return sendSlackAlert(statusCode === 429 ? 'warning' : 'critical', {
    service: 'peskids',
    component: 'legacy-crm',
    operation,
    error: errorMsg,
    leadId,
  });
}

export async function alertN8nFailure(
  operation: string,
  error: unknown,
  leadId?: string
): Promise<void> {
  return sendSlackAlert('critical', {
    service: 'peskids',
    component: 'n8n',
    operation,
    error: error instanceof Error ? error.message : String(error),
    leadId,
  });
}

export async function alertWebhookFailure(
  operation: string,
  error: string
): Promise<void> {
  return sendSlackAlert('critical', {
    service: 'peskids',
    component: 'webhook-receiver',
    operation,
    error,
  });
}

export async function alertDeployFailure(error: string): Promise<void> {
  return sendSlackAlert('critical', {
    service: 'opsly',
    component: 'deployment',
    operation: 'deploy',
    error,
  });
}

export async function alertCircuitBreakerTrip(
  service: string,
  failureCount: number,
  windowMs: number
): Promise<void> {
  return sendSlackAlert('warning', {
    service: 'opsly',
    component: 'circuit-breaker',
    operation: 'trip',
    error: `Circuit opened after ${failureCount} failures in ${windowMs}ms`,
    context: { failureCount, windowMs },
  });
}

export async function alertDeadLetterQueueBacklog(count: number, ageMinutes: number): Promise<void> {
  return sendSlackAlert('warning', {
    service: 'opsly',
    component: 'dead-letter-queue',
    operation: 'backlog-warning',
    error: `${count} leads pending retry (age > ${ageMinutes}min)`,
    context: { pendingCount: count, ageMinutes },
  });
}
