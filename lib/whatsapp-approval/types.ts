/**
 * WhatsApp Message Approval Types
 */

export type MessageApprovalStatus =
  | 'draft'
  | 'pending_approval'
  | 'approved'
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'rejected'
  | 'cancelled';

export type MessageType = 'text' | 'template' | 'media' | 'interactive';

export interface WhatsAppOutboxMessage {
  id: string;
  tenantId: string;
  contactId: string;
  phoneNumber: string;
  messageType: MessageType;
  body: string;
  mediaUrl?: string;
  templateName?: string;
  templateParameters?: Record<string, string>;
  status: MessageApprovalStatus;
  approvalRequired: boolean;
  approvedAt?: Date;
  approvedBy?: string;
  rejectedAt?: Date;
  rejectedBy?: string;
  rejectionReason?: string;
  sentAt?: Date;
  deliveredAt?: Date;
  failedAt?: Date;
  errorCode?: string;
  errorMessage?: string;
  externalMessageId?: string;
  correlationId: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ApprovalAuditEntry {
  id: string;
  messageId: string;
  action: 'created' | 'approved' | 'rejected' | 'sent' | 'failed';
  actor: string;
  timestamp: Date;
  reason?: string;
  details?: Record<string, unknown>;
}

export interface ApprovalRequest {
  messageId: string;
  tenantId: string;
  contactPhone: string;
  body: string;
  type: MessageType;
  approvalRequired: boolean;
}

export interface ApprovalResponse {
  ok: boolean;
  messageId?: string;
  status?: MessageApprovalStatus;
  error?: string;
}
