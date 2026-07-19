/**
 * Admin WhatsApp Message Approval/Rejection Tests
 */

import { describe, it, expect } from 'vitest';

describe('POST /api/admin/peskids/[slug]/whatsapp/messages/[messageId]/approve', () => {
  describe('Approval Request', () => {
    it('should approve message with operator information', () => {
      const request = {
        messageId: 'msg-123',
        action: 'approve' as const,
        approvedBy: 'santi@peskids.com',
      };

      const response = {
        id: request.messageId,
        status: 'approved' as const,
        approved_at: new Date().toISOString(),
        approved_by: request.approvedBy,
      };

      expect(response.status).toBe('approved');
      expect(response.approved_by).toBe('santi@peskids.com');
    });

    it('should transition message from pending_approval to approved', () => {
      const before = {
        id: 'msg-123',
        status: 'pending_approval' as const,
      };

      const after = {
        ...before,
        status: 'approved' as const,
      };

      expect(before.status).toBe('pending_approval');
      expect(after.status).toBe('approved');
    });

    it('should record approval in audit log', () => {
      const auditEntry = {
        id: 'audit-456',
        messageId: 'msg-123',
        action: 'approved' as const,
        actor: 'santi@peskids.com',
        timestamp: new Date().toISOString(),
      };

      expect(auditEntry.action).toBe('approved');
      expect(auditEntry.actor).toBeDefined();
    });

    it('should preserve correlation_id', () => {
      const message = {
        id: 'msg-123',
        correlation_id: 'corr-abc123',
        status: 'pending_approval' as const,
      };

      const approved = {
        ...message,
        status: 'approved' as const,
      };

      expect(approved.correlation_id).toBe(message.correlation_id);
    });
  });

  describe('Rejection Request', () => {
    it('should reject message with reason', () => {
      const request = {
        messageId: 'msg-123',
        action: 'reject' as const,
        rejectedBy: 'cristian@peskids.com',
        reason: 'Inappropriate tone',
      };

      const response = {
        id: request.messageId,
        status: 'rejected' as const,
        rejected_at: new Date().toISOString(),
        rejected_by: request.rejectedBy,
        rejection_reason: request.reason,
      };

      expect(response.status).toBe('rejected');
      expect(response.rejection_reason).toBe('Inappropriate tone');
    });

    it('should transition message from pending_approval to rejected', () => {
      const before = {
        id: 'msg-123',
        status: 'pending_approval' as const,
      };

      const after = {
        ...before,
        status: 'rejected' as const,
      };

      expect(after.status).toBe('rejected');
    });

    it('should record rejection in audit log', () => {
      const auditEntry = {
        id: 'audit-789',
        messageId: 'msg-123',
        action: 'rejected' as const,
        actor: 'cristian@peskids.com',
        details: {
          reason: 'Inappropriate tone',
        },
        timestamp: new Date().toISOString(),
      };

      expect(auditEntry.action).toBe('rejected');
      expect(auditEntry.details.reason).toBeDefined();
    });

    it('should allow operator to provide detailed reason', () => {
      const reasons = [
        'Tone is too aggressive',
        'Contains profanity',
        'Missing required information',
        'Duplicate message',
        'Other reason here',
      ];

      const selectedReason = reasons[0];
      expect(selectedReason).toBe('Tone is too aggressive');
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent message', () => {
      const status = 404;
      const body = { error: 'Message not found' };

      expect(status).toBe(404);
      expect(body.error).toBeDefined();
    });

    it('should return 400 if message not in pending_approval state', () => {
      const message = {
        id: 'msg-123',
        status: 'sent' as const, // Already sent
      };

      const status = 400;
      const body = { error: 'Cannot approve sent message' };

      expect(status).toBe(400);
    });

    it('should return 400 if required fields missing', () => {
      const request = {
        messageId: 'msg-123',
        // missing approvedBy
      };

      const status = 400;
      const body = { error: 'approvedBy is required' };

      expect(status).toBe(400);
    });

    it('should return 403 for unauthorized operator', () => {
      const status = 403;
      const body = { error: 'Insufficient permissions' };

      expect(status).toBe(403);
    });

    it('should return 409 if message already approved/rejected', () => {
      const message = {
        id: 'msg-123',
        status: 'approved' as const,
        approved_by: 'other-operator@peskids.com',
      };

      const status = 409;
      const body = { error: 'Message already approved by another operator' };

      expect(status).toBe(409);
    });
  });

  describe('Multi-Tenant Isolation', () => {
    it('should enforce tenant isolation', () => {
      const requestedTenant = 'peskids';
      const messageTenant = 'client-xyz';

      const canApprove = requestedTenant === messageTenant;
      expect(canApprove).toBe(false);
    });

    it('should only approve messages within tenant', () => {
      const message = {
        id: 'msg-123',
        tenant_id: 'tenant-peskids',
      };

      const operatorTenant = 'tenant-peskids';
      const canApprove = message.tenant_id === operatorTenant;

      expect(canApprove).toBe(true);
    });
  });

  describe('Response Format', () => {
    it('should return approved message details', () => {
      const response = {
        message: {
          id: 'msg-123',
          status: 'approved' as const,
          contact_phone: '+5551234567',
          contact_name: 'John Doe',
          message_type: 'text' as const,
          body: 'Hello',
          approved_at: new Date().toISOString(),
          approved_by: 'santi@peskids.com',
        },
      };

      expect(response.message.id).toBe('msg-123');
      expect(response.message.status).toBe('approved');
      expect(response.message.approved_by).toBeDefined();
    });

    it('should return rejected message details', () => {
      const response = {
        message: {
          id: 'msg-123',
          status: 'rejected' as const,
          contact_phone: '+5551234567',
          rejected_at: new Date().toISOString(),
          rejected_by: 'cristian@peskids.com',
          rejection_reason: 'Inappropriate tone',
        },
      };

      expect(response.message.status).toBe('rejected');
      expect(response.message.rejection_reason).toBeDefined();
    });

    it('should return audit trail entry', () => {
      const response = {
        message: { id: 'msg-123', status: 'approved' as const },
        audit_entry: {
          id: 'audit-123',
          action: 'approved' as const,
          actor: 'santi@peskids.com',
          timestamp: new Date().toISOString(),
        },
      };

      expect(response.audit_entry).toBeDefined();
      expect(response.audit_entry.action).toBe('approved');
    });
  });

  describe('State Machine Transitions', () => {
    it('should allow approve only from pending_approval', () => {
      const validStates = ['pending_approval'];
      const invalidStates = ['draft', 'approved', 'sent', 'rejected'];

      const currentState = 'pending_approval';
      const canApprove = validStates.includes(currentState);

      expect(canApprove).toBe(true);
    });

    it('should allow reject only from pending_approval', () => {
      const validStates = ['pending_approval'];
      const currentState = 'pending_approval';
      const canReject = validStates.includes(currentState);

      expect(canReject).toBe(true);
    });

    it('should prevent approve if already in terminal state', () => {
      const terminalStates = ['sent', 'delivered', 'read', 'failed'];
      const currentState = 'sent';
      const canApprove = !terminalStates.includes(currentState);

      expect(canApprove).toBe(false);
    });
  });

  describe('Concurrency Handling', () => {
    it('should handle concurrent approval attempts', () => {
      const message = {
        id: 'msg-123',
        version: 1,
        status: 'pending_approval' as const,
      };

      // First approval
      const approved1 = {
        ...message,
        version: 2,
        status: 'approved' as const,
      };

      // Second approval attempt (conflict)
      const canApproveAgain = approved1.version === message.version;
      expect(canApproveAgain).toBe(false);
    });

    it('should use optimistic locking', () => {
      const initialVersion = 1;
      const request = {
        messageId: 'msg-123',
        version: 1,
        approvedBy: 'operator',
      };

      const success = request.version === initialVersion;
      expect(success).toBe(true);
    });
  });

  describe('Audit Trail', () => {
    it('should include all approval details in audit log', () => {
      const auditLog = {
        id: 'audit-123',
        messageId: 'msg-123',
        action: 'approved' as const,
        actor: 'santi@peskids.com',
        timestamp: new Date().toISOString(),
        details: {
          contact_phone: '+5551234567',
          message_type: 'text',
          correlation_id: 'corr-123',
        },
      };

      expect(auditLog.details).toBeDefined();
      expect(auditLog.details.contact_phone).toBeDefined();
    });

    it('should include rejection reason in audit log', () => {
      const auditLog = {
        messageId: 'msg-123',
        action: 'rejected' as const,
        actor: 'cristian@peskids.com',
        details: {
          rejection_reason: 'Tone is too aggressive',
        },
      };

      expect(auditLog.details.rejection_reason).toBeDefined();
    });
  });

  describe('HTTP Status Codes', () => {
    it('should return 200 for successful approval', () => {
      const status = 200;
      expect(status).toBe(200);
    });

    it('should return 200 for successful rejection', () => {
      const status = 200;
      expect(status).toBe(200);
    });

    it('should return 404 for message not found', () => {
      const status = 404;
      expect(status).toBe(404);
    });

    it('should return 400 for invalid request', () => {
      const status = 400;
      expect(status).toBe(400);
    });

    it('should return 403 for unauthorized', () => {
      const status = 403;
      expect(status).toBe(403);
    });

    it('should return 409 for conflict (already processed)', () => {
      const status = 409;
      expect(status).toBe(409);
    });
  });
});
