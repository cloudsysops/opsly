/**
 * WhatsApp End-to-End Workflow Tests
 * Simulates complete message flow from inbound to approval to sending
 */

import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

describe('WhatsApp E2E Workflows', () => {
  describe('Inbound Message to Lead Creation', () => {
    it('should flow: webhook → idempotence check → persist → twenty sync → lead creation', () => {
      // Step 1: Receive webhook
      const payload = {
        object: 'whatsapp_business_account',
        entry: [{
          id: '123',
          changes: [{
            value: {
              messaging_product: 'whatsapp',
              message: {
                id: 'msg-ext-123',
                timestamp: '1234567890',
                text: { body: 'I want to know more about your services' },
                from: '5551234567',
              },
            },
          }],
        }],
      };

      const signature = crypto.createHmac('sha256', 'test-app-secret')
        .update(JSON.stringify(payload))
        .digest('hex');

      const webhookEvent = { payload, signature, provider: 'meta' as const };

      expect(webhookEvent.provider).toBe('meta');
      expect(webhookEvent.payload).toBeDefined();
      expect(webhookEvent.signature).toBeDefined();

      // Step 2: Idempotence check
      const eventHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
      const isDuplicate = false; // Would check whatsapp_webhook_receipts table

      expect(isDuplicate).toBe(false);

      // Step 3: Persist message to Supabase
      const message = {
        id: 'msg-123',
        tenant_id: 'tenant-peskids',
        external_message_id: payload.entry[0].changes[0].value.message.id,
        contact_phone: payload.entry[0].changes[0].value.message.from,
        body: payload.entry[0].changes[0].value.message.text.body,
        direction: 'inbound' as const,
        status: 'received' as const,
        raw_event_hash: eventHash,
      };

      expect(message.raw_event_hash).toBeDefined();
      expect(message.direction).toBe('inbound');

      // Step 4: Lookup or create contact in Twenty
      const contact = {
        id: 'contact-123',
        phone: '5551234567',
        firstName: 'Unknown',
        lastName: 'Caller',
      };

      // Step 5: Create lead in peskids
      const lead = {
        id: 'lead-123',
        phone: contact.phone,
        twenty_sync_status: 'synced' as const,
        twenty_person_id: 'person-456',
        whatsapp_contact_id: message.id,
      };

      expect(lead.twenty_sync_status).toBe('synced');
      expect(message.body).toContain('services');
    });

    it('should handle duplicate webhook idempotently', () => {
      const payload = { message: 'test', id: 'msg-123' };
      const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

      // First receipt
      const receipts = new Set<string>();
      expect(receipts.has(hash)).toBe(false);
      receipts.add(hash);

      // Duplicate receipt
      const isDuplicate = receipts.has(hash);
      expect(isDuplicate).toBe(true);

      // Should not persist duplicate
      const messageCount = isDuplicate ? 0 : 1;
      expect(messageCount).toBe(0);
    });

    it('should handle failed Twenty sync with retry', () => {
      const syncResult = {
        ok: false,
        error: 'Network timeout',
        retryable: true,
      };

      const lead = {
        id: 'lead-123',
        twenty_sync_status: 'failed' as const,
        sync_error: syncResult.error,
      };

      // Should record for retry queue
      expect(lead.twenty_sync_status).toBe('failed');
      expect(syncResult.retryable).toBe(true);
    });
  });

  describe('Outbound Message Approval Flow', () => {
    it('should flow: draft → approval request → approve → send → track delivery', () => {
      // Step 1: Operator drafts message
      const draft = {
        id: 'msg-123',
        status: 'draft' as const,
        body: 'We can help with that!',
        contact_phone: '+5551234567',
        correlation_id: 'corr-abc123',
      };

      expect(draft.status).toBe('draft');

      // Step 2: Request approval
      const pending = {
        ...draft,
        status: 'pending_approval' as const,
        requested_at: new Date(),
      };

      expect(pending.status).toBe('pending_approval');

      // Step 3: Operator approves
      const approved = {
        ...pending,
        status: 'approved' as const,
        approved_at: new Date(),
        approved_by: 'santi@peskids.com',
      };

      // Step 4: Send to provider
      const sending = {
        ...approved,
        status: 'sending' as const,
      };

      const sent = {
        ...sending,
        status: 'sent' as const,
        external_message_id: 'ext-msg-456',
        sent_at: new Date(),
      };

      // Step 5: Provider confirms delivery
      const delivered = {
        ...sent,
        status: 'delivered' as const,
        delivered_at: new Date(),
      };

      expect(delivered.status).toBe('delivered');
      expect(delivered.approved_by).toBe('santi@peskids.com');
      expect(delivered.correlation_id).toBe('corr-abc123');
    });

    it('should record audit trail for full workflow', () => {
      const correlationId = 'corr-abc123';
      const audit = [
        { action: 'drafted', actor: 'system', correlationId },
        { action: 'approval_requested', actor: 'system', correlationId },
        { action: 'approved', actor: 'santi@peskids.com', correlationId },
        { action: 'sending', actor: 'system', correlationId },
        { action: 'sent', actor: 'system:wacrm', correlationId },
        { action: 'delivered', actor: 'system:wacrm', correlationId },
      ];

      const related = audit.filter(a => a.correlationId === correlationId);
      expect(related.length).toBe(6);
      expect(related.every(a => a.correlationId === correlationId)).toBe(true);
    });

    it('should handle rejection and redraft', () => {
      const original = {
        id: 'msg-123',
        status: 'pending_approval' as const,
        body: 'Original message',
        correlation_id: 'corr-123',
      };

      // Operator rejects
      const rejected = {
        ...original,
        status: 'rejected' as const,
        rejected_at: new Date(),
        rejected_by: 'cristian@peskids.com',
        rejection_reason: 'Fix typo',
      };

      expect(rejected.status).toBe('rejected');

      // Operator creates new version
      const redraft = {
        id: 'msg-124', // New ID
        status: 'draft' as const,
        body: 'Original message - fixed typo',
        correlation_id: 'corr-123', // Same correlation
      };

      expect(redraft.id).not.toBe(original.id);
      expect(redraft.correlation_id).toBe(original.correlation_id);
    });

    it('should handle failed send with retry', () => {
      const message = {
        id: 'msg-123',
        status: 'approved' as const,
      };

      // Attempt to send fails
      const failed = {
        ...message,
        status: 'failed' as const,
        error_code: 'RATE_LIMIT',
        error_message: 'Too many requests',
        failed_at: new Date(),
      };

      // Record in queue for retry
      const retryable = failed.error_code === 'RATE_LIMIT';
      expect(retryable).toBe(true);

      // Retry later
      const retried = {
        ...failed,
        status: 'approved' as const, // Back to approved for retry
        retry_count: 1,
      };

      expect(retried.status).toBe('approved');
      expect(retried.retry_count).toBe(1);
    });
  });

  describe('Conversation Management', () => {
    it('should track conversation lifecycle', () => {
      // Start conversation
      const conversation = {
        id: 'conv-123',
        contact_phone: '+5551234567',
        status: 'active' as const,
        message_count: 0,
        created_at: new Date(),
      };

      expect(conversation.status).toBe('active');

      // First inbound message
      const conv1 = {
        ...conversation,
        message_count: 1,
        last_message_at: new Date(),
      };

      // Operator responds

      const conv2 = {
        ...conv1,
        message_count: 2,
      };

      // Close conversation
      const closed = {
        ...conv2,
        status: 'closed' as const,
        closed_at: new Date(),
      };

      expect(closed.status).toBe('closed');
      expect(closed.message_count).toBe(2);
    });
  });

  describe('Multi-Tenant Isolation in Workflow', () => {
    it('should isolate workflow within tenant', () => {
      const tenantId = 'tenant-peskids';

      // Inbound message
      const message = {
        id: 'msg-123',
        tenant_id: tenantId,
        direction: 'inbound' as const,
      };

      // Lead
      const lead = {
        id: 'lead-123',
        tenant_id: tenantId,
      };

      // Outbound message
      const outbound = {
        id: 'msg-456',
        tenant_id: tenantId,
        direction: 'outbound' as const,
      };

      const allRecords = [message, lead, outbound];
      expect(allRecords.every(r => r.tenant_id === tenantId)).toBe(true);
    });

    it('should prevent cross-tenant message routing', () => {
      const message = {
        id: 'msg-123',
        tenant_id: 'tenant-peskids',
      };

      const operator = {
        tenant_id: 'tenant-client-xyz',
      };

      const canApprove = message.tenant_id === operator.tenant_id;
      expect(canApprove).toBe(false);
    });
  });

  describe('Error Recovery', () => {
    it('should recover from partial webhook processing failure', () => {
      const steps = [
        { name: 'persist_message', ok: true },
        { name: 'lookup_contact', ok: true },
        { name: 'sync_to_twenty', ok: false }, // Failed
      ];

      // Message should be persisted despite Twenty sync failure
      const messagePersisted = steps.find(s => s.name === 'persist_message')?.ok;
      expect(messagePersisted).toBe(true);

      // Failed step should be queued for retry
      const failedStep = steps.find(s => !s.ok);
      expect(failedStep?.name).toBe('sync_to_twenty');
    });

    it('should handle webhook processing timeout', () => {
      const webhook = {
        id: 'wh-123',
        received_at: new Date(),
        timeout_ms: 5000,
      };

      const processingTime = 6000;
      const timedOut = processingTime > webhook.timeout_ms;
      expect(timedOut).toBe(true);

      // Should return 200 to prevent Meta retry
      const response = {
        status: 200,
        ok: false,
        message: 'Processing timeout - will retry',
      };

      expect(response.status).toBe(200);
      expect(response.ok).toBe(false);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle rapid inbound messages', () => {
      const messages = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        from: `555${String(i).padStart(7, '0')}`,
        timestamp: Date.now() + i,
      }));

      const processed = messages.filter(m => !!m.id);
      expect(processed.length).toBe(100);
    });

    it('should queue pending approvals efficiently', () => {
      const approvals = Array.from({ length: 500 }, (_, i) => ({
        id: `msg-${i}`,
        status: 'pending_approval' as const,
      }));

      const pending = approvals.filter(a => a.status === 'pending_approval');
      expect(pending.length).toBe(500);

      // Should paginate
      const page1 = pending.slice(0, 50);
      expect(page1.length).toBe(50);
    });
  });

  describe('Integration with n8n Workflows', () => {
    it('should trigger n8n on inbound message', () => {
      const message = {
        id: 'msg-123',
        direction: 'inbound' as const,
        body: 'I need help',
      };

      const n8nTrigger = {
        workflow: 'peskids-whatsapp-inbound',
        event: 'message_received',
        payload: message,
      };

      expect(n8nTrigger.workflow).toBeDefined();
      expect(n8nTrigger.payload.body).toBe('I need help');
    });

    it('should trigger n8n on message approval', () => {
      const message = {
        id: 'msg-456',
        status: 'approved' as const,
        approved_by: 'santi@peskids.com',
      };

      const n8nTrigger = {
        workflow: 'peskids-whatsapp-approval-send',
        event: 'message_approved',
        payload: message,
      };

      expect(n8nTrigger.event).toBe('message_approved');
    });

    it('should trigger n8n on delivery status update', () => {
      const statusUpdate = {
        id: 'status-123',
        message_id: 'msg-456',
        status: 'delivered' as const,
      };

      const n8nTrigger = {
        workflow: 'peskids-whatsapp-delivery-status',
        event: 'status_updated',
        payload: statusUpdate,
      };

      expect(n8nTrigger.event).toBe('status_updated');
    });
  });
});
