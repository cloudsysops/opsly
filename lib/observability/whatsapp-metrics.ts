/**
 * WhatsApp Integration Metrics & Health Checks
 */

export interface WhatsAppMetrics {
  webhooksReceived: number;
  webhooksProcessed: number;
  webhooksFailed: number;
  lastWebhookAt?: Date;
  messagesSent: number;
  messagesDelivered: number;
  messagesFailed: number;
  lastMessageSentAt?: Date;
  twentySyncPending: number;
  twentySyncFailed: number;
  approvalsPending: number;
  approvalsApproved: number;
  approvalsRejected: number;
}

class WhatsAppMetricsCollector {
  private metrics: WhatsAppMetrics = {
    webhooksReceived: 0,
    webhooksProcessed: 0,
    webhooksFailed: 0,
    messagesSent: 0,
    messagesDelivered: 0,
    messagesFailed: 0,
    twentySyncPending: 0,
    twentySyncFailed: 0,
    approvalsPending: 0,
    approvalsApproved: 0,
    approvalsRejected: 0,
  };

  recordWebhookReceived(): void {
    this.metrics.webhooksReceived++;
    this.metrics.lastWebhookAt = new Date();
  }

  recordWebhookProcessed(): void {
    this.metrics.webhooksProcessed++;
  }

  recordWebhookFailed(): void {
    this.metrics.webhooksFailed++;
  }

  recordMessageSent(): void {
    this.metrics.messagesSent++;
    this.metrics.lastMessageSentAt = new Date();
  }

  recordMessageDelivered(): void {
    this.metrics.messagesDelivered++;
  }

  recordMessageFailed(): void {
    this.metrics.messagesFailed++;
  }

  recordTwentySyncPending(count: number): void {
    this.metrics.twentySyncPending = count;
  }

  recordTwentySyncFailed(count: number): void {
    this.metrics.twentySyncFailed = count;
  }

  recordApprovalsPending(count: number): void {
    this.metrics.approvalsPending = count;
  }

  recordApprovalsApproved(count: number): void {
    this.metrics.approvalsApproved = count;
  }

  recordApprovalsRejected(count: number): void {
    this.metrics.approvalsRejected = count;
  }

  getMetrics(): WhatsAppMetrics {
    return { ...this.metrics };
  }

  reset(): void {
    this.metrics = {
      webhooksReceived: 0,
      webhooksProcessed: 0,
      webhooksFailed: 0,
      messagesSent: 0,
      messagesDelivered: 0,
      messagesFailed: 0,
      twentySyncPending: 0,
      twentySyncFailed: 0,
      approvalsPending: 0,
      approvalsApproved: 0,
      approvalsRejected: 0,
    };
  }
}

export const whatsappMetrics = new WhatsAppMetricsCollector();

/**
 * Health check endpoint for WhatsApp integrations
 */
export interface WhatsAppHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    webhooks_healthy: boolean;
    messages_flowing: boolean;
    twenty_sync_catchup: boolean;
    approvals_queue_healthy: boolean;
  };
  metrics: WhatsAppMetrics;
  warnings: string[];
}

export function getWhatsAppHealth(): WhatsAppHealth {
  const metrics = whatsappMetrics.getMetrics();
  const warnings: string[] = [];

  // Check for webhook stagnation
  const lastWebhookAge = metrics.lastWebhookAt ? Date.now() - metrics.lastWebhookAt.getTime() : Number.MAX_VALUE;
  const webhooksHealthy = lastWebhookAge < 5 * 60 * 1000; // 5 minutes

  // Check for message flow
  const messagesFlowing = metrics.messagesSent > 0 || metrics.webhooksProcessed > 0;

  // Check Twenty sync backlog
  const twentySyncCatchup = metrics.twentySyncPending < 100;
  if (!twentySyncCatchup) {
    warnings.push(`Twenty CRM sync backlog: ${metrics.twentySyncPending} pending`);
  }

  // Check approval queue
  const approvalsQueueHealthy = metrics.approvalsPending < 50;
  if (!approvalsQueueHealthy) {
    warnings.push(`Approvals queue: ${metrics.approvalsPending} pending`);
  }

  // Determine overall health
  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (!webhooksHealthy || metrics.webhooksFailed > 10) {
    status = 'degraded';
  }
  if (!messagesFlowing && metrics.messagesFailed > 0) {
    status = 'unhealthy';
  }

  return {
    status,
    checks: {
      webhooks_healthy: webhooksHealthy,
      messages_flowing: messagesFlowing,
      twenty_sync_catchup: twentySyncCatchup,
      approvals_queue_healthy: approvalsQueueHealthy,
    },
    metrics,
    warnings,
  };
}
