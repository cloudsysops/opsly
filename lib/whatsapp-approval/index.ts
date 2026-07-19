/**
 * WhatsApp Approval-First Outbox Module
 */

export type {
  MessageApprovalStatus,
  MessageType,
  WhatsAppOutboxMessage,
  ApprovalAuditEntry,
  ApprovalRequest,
  ApprovalResponse,
} from './types';

export {
  draftMessage,
  requestApproval,
  approveMessage,
  rejectMessage,
  listPendingApprovals,
  retryFailedMessage,
  cancelMessage,
} from './outbox';

export {
  logApprovalAction,
  getAuditTrail,
  getOperatorAuditSummary,
} from './audit';
