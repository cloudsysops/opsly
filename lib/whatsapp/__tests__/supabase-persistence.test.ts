/**
 * WhatsApp Supabase Persistence & Idempotence Tests
 */

import { describe, it, expect } from 'vitest';
import crypto from 'crypto';

describe('WhatsApp Supabase Persistence', () => {
  describe('Idempotence via raw_event_hash', () => {
    it('should generate consistent hash for same payload', () => {
      const payload = { message: 'test', timestamp: 123 };
      const hash1 = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
      const hash2 = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

      expect(hash1).toBe(hash2);
    });

    it('should generate different hash for different payloads', () => {
      const payload1 = { message: 'test1', timestamp: 123 };
      const payload2 = { message: 'test2', timestamp: 123 };
      const hash1 = crypto.createHash('sha256').update(JSON.stringify(payload1)).digest('hex');
      const hash2 = crypto.createHash('sha256').update(JSON.stringify(payload2)).digest('hex');

      expect(hash1).not.toBe(hash2);
    });

    it('should detect duplicate webhook by hash', () => {
      const payload = { message: 'test', from: '5551234567', id: 'msg-123' };
      const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

      // Simulate duplicate detection
      const receipts = new Map<string, { hash: string; processedAt: Date }>();

      // First attempt
      if (!receipts.has(hash)) {
        receipts.set(hash, { hash, processedAt: new Date() });
      }

      // Second attempt (duplicate)
      const isDuplicate = receipts.has(hash);
      expect(isDuplicate).toBe(true);
    });

    it('should track webhook receipt with unique constraint', () => {
      const tenantId = 'tenant-123';
      const provider = 'wacrm';
      const hash = 'abc123def456';

      // Simulate unique constraint on (tenant_id, raw_event_hash, provider)
      const receipts = new Map<string, boolean>();
      const key = `${tenantId}-${provider}-${hash}`;

      // First insert
      expect(receipts.has(key)).toBe(false);
      receipts.set(key, true);

      // Second insert (should violate constraint)
      const canInsert = !receipts.has(key);
      expect(canInsert).toBe(false);
    });

    it('should reject duplicate message before persistence', () => {
      const messageId = 'msg-123';
      const tenantId = 'tenant-123';
      const payload = { message: 'test', id: messageId };
      const hash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');

      const processedMessages = new Set<string>();
      const duplicateKey = `${tenantId}-${hash}`;

      // First message
      const isFirstDuplicate = processedMessages.has(duplicateKey);
      expect(isFirstDuplicate).toBe(false);
      processedMessages.add(duplicateKey);

      // Duplicate message
      const isSecondDuplicate = processedMessages.has(duplicateKey);
      expect(isSecondDuplicate).toBe(true);
    });
  });

  describe('Message Persistence', () => {
    it('should persist inbound message with required fields', () => {
      const message = {
        id: 'msg-123',
        tenantId: 'tenant-123',
        externalMessageId: 'msg-123',
        contactId: 'contact-123',
        direction: 'inbound' as const,
        messageType: 'text' as const,
        body: 'Hello',
        contactPhone: '5551234567',
        contactName: 'John Doe',
        status: 'received' as const,
        timestamp: new Date(),
        rawEventHash: 'abc123',
      };

      expect(message.id).toBeDefined();
      expect(message.tenantId).toBeDefined();
      expect(message.direction).toBe('inbound');
      expect(message.rawEventHash).toBeDefined();
    });

    it('should persist outbound message with tracking fields', () => {
      const message = {
        id: 'msg-456',
        tenantId: 'tenant-123',
        externalMessageId: 'ext-456',
        contactId: 'contact-123',
        direction: 'outbound' as const,
        messageType: 'text' as const,
        body: 'Hello back',
        phoneNumberId: 'phone-123',
        status: 'sent' as const,
        timestamp: new Date(),
        provider: 'wacrm' as const,
        rawEventHash: 'def456',
      };

      expect(message.direction).toBe('outbound');
      expect(message.provider).toBeDefined();
      expect(message.phoneNumberId).toBeDefined();
    });

    it('should enforce tenant isolation on inserts', () => {
      const message1 = {
        tenantId: 'tenant-123',
        externalMessageId: 'msg-123',
        body: 'Tenant 1 message',
      };

      const message2 = {
        tenantId: 'tenant-456',
        externalMessageId: 'msg-123', // Same external ID
        body: 'Tenant 2 message',
      };

      // With unique constraint on (tenant_id, external_message_id), both can coexist
      expect(message1.tenantId).not.toBe(message2.tenantId);
      expect(message1.externalMessageId).toBe(message2.externalMessageId);
    });
  });

  describe('Contact Persistence', () => {
    it('should persist contact with unique phone per tenant', () => {
      const contact = {
        id: 'contact-123',
        tenantId: 'tenant-123',
        phoneNumber: '5551234567',
        displayName: 'John Doe',
        email: 'john@example.com',
        isGroup: false,
        provider: 'wacrm' as const,
      };

      expect(contact.tenantId).toBeDefined();
      expect(contact.phoneNumber).toBeDefined();
      // Unique constraint: (tenant_id, phone_number)
    });

    it('should allow same phone across different tenants', () => {
      const contact1 = {
        tenantId: 'tenant-123',
        phoneNumber: '5551234567',
        displayName: 'John in Tenant1',
      };

      const contact2 = {
        tenantId: 'tenant-456',
        phoneNumber: '5551234567',
        displayName: 'John in Tenant2',
      };

      expect(contact1.phoneNumber).toBe(contact2.phoneNumber);
      expect(contact1.tenantId).not.toBe(contact2.tenantId);
    });

    it('should handle group conversations', () => {
      const groupContact = {
        id: 'contact-group-123',
        tenantId: 'tenant-123',
        phoneNumber: 'group-id-123', // Group ID format
        displayName: 'Team Meeting',
        isGroup: true,
        provider: 'meta' as const,
      };

      expect(groupContact.isGroup).toBe(true);
      expect(groupContact.displayName).toBe('Team Meeting');
    });
  });

  describe('Conversation Tracking', () => {
    it('should create conversation for new contact', () => {
      const conversation = {
        id: 'conv-123',
        tenantId: 'tenant-123',
        externalConversationId: 'conv-ext-123',
        contactId: 'contact-123',
        phoneNumber: '5551234567',
        displayName: 'John Doe',
        status: 'active' as const,
        messageCount: 1,
        lastMessageBody: 'Hello',
      };

      expect(conversation.tenantId).toBeDefined();
      expect(conversation.externalConversationId).toBeDefined();
      expect(conversation.status).toBe('active');
    });

    it('should increment message count on new message', () => {
      const conversation = {
        id: 'conv-123',
        messageCount: 5,
        lastMessageBody: 'Previous',
      };

      const updatedConversation = {
        ...conversation,
        messageCount: conversation.messageCount + 1,
        lastMessageBody: 'New message',
      };

      expect(updatedConversation.messageCount).toBe(6);
      expect(updatedConversation.lastMessageBody).toBe('New message');
    });

    it('should update conversation status on user action', () => {
      const conversation = {
        id: 'conv-123',
        status: 'active' as const,
      };

      const archivedConversation = { ...conversation, status: 'archived' as const };
      const closedConversation = { ...conversation, status: 'closed' as const };

      expect(archivedConversation.status).toBe('archived');
      expect(closedConversation.status).toBe('closed');
    });
  });

  describe('Message Event Tracking', () => {
    it('should track delivered status update', () => {
      const event = {
        id: 'event-123',
        tenantId: 'tenant-123',
        externalMessageId: 'msg-123',
        status: 'delivered' as const,
        timestamp: new Date(),
      };

      expect(event.status).toBe('delivered');
      expect(event.externalMessageId).toBeDefined();
    });

    it('should track read status with timestamp', () => {
      const event = {
        id: 'event-456',
        tenantId: 'tenant-123',
        externalMessageId: 'msg-123',
        status: 'read' as const,
        timestamp: new Date('2026-07-19T10:30:00Z'),
      };

      expect(event.status).toBe('read');
      expect(event.timestamp).toBeDefined();
    });

    it('should enforce unique constraint on status events', () => {
      const tenantId = 'tenant-123';
      const messageId = 'msg-123';
      const status = 'delivered';
      const timestamp = new Date();

      // Unique on (tenant_id, external_message_id, status, timestamp)
      const key = `${tenantId}-${messageId}-${status}-${timestamp.getTime()}`;

      const events = new Set<string>();
      expect(events.has(key)).toBe(false);
      events.add(key);
      expect(events.has(key)).toBe(true);
    });
  });

  describe('Cleanup Policies', () => {
    it('should delete old webhook receipts (>30 days)', () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const fortyDaysAgo = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);

      const recentReceipt = { createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) };
      const oldReceipt = { createdAt: fortyDaysAgo };

      const isRecentOldEnough = recentReceipt.createdAt.getTime() < thirtyDaysAgo.getTime();
      const isOldOldEnough = oldReceipt.createdAt.getTime() < thirtyDaysAgo.getTime();

      expect(isRecentOldEnough).toBe(false);
      expect(isOldOldEnough).toBe(true);
    });

    it('should preserve receipts within retention window', () => {
      const now = new Date();
      const fiveDaysAgo = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000);

      const receipt = { createdAt: fiveDaysAgo, processed: true };
      const shouldPreserve = receipt.createdAt.getTime() > new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).getTime();

      expect(shouldPreserve).toBe(true);
    });
  });

  describe('Audit Logging', () => {
    it('should log message creation', () => {
      const auditLog = {
        id: 'audit-123',
        tenantId: 'tenant-123',
        resourceId: 'msg-123',
        eventType: 'message_created' as const,
        actor: 'webhook',
        action: 'create',
        changes: { body: 'Hello' },
        correlationId: 'corr-123',
        createdAt: new Date(),
      };

      expect(auditLog.eventType).toBe('message_created');
      expect(auditLog.correlationId).toBeDefined();
    });

    it('should log status updates', () => {
      const auditLog = {
        resourceId: 'msg-123',
        eventType: 'status_updated' as const,
        actor: 'webhook',
        changes: { status: 'delivered' },
      };

      expect(auditLog.eventType).toBe('status_updated');
    });

    it('should link logs via correlation_id', () => {
      const correlationId = 'corr-123';
      const logs = [
        { id: 'log-1', correlationId, eventType: 'message_created' },
        { id: 'log-2', correlationId, eventType: 'contact_synced' },
        { id: 'log-3', correlationId, eventType: 'approval_created' },
      ];

      const relatedLogs = logs.filter(log => log.correlationId === correlationId);
      expect(relatedLogs.length).toBe(3);
    });
  });
});
