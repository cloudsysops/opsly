// Royalty Management Module
export {
  DEFAULT_ROYALTY_CONFIG,
  getRoyaltyConfig,
  calculateRoyaltyAmounts,
  generateInvoiceForFranchisee,
  generateAllInvoices,
  updateInvoiceStatus,
  recordPayment,
  getInvoiceWithDetails,
  getOutstandingBalance,
  getMonthName,
} from './invoice-generator';

export {
  sendInvoiceForReview,
  sendDisputeNotification,
  sendPaymentConfirmation,
  sendOverdueReminder,
  sendPaymentDueNotification,
} from './notifications';
