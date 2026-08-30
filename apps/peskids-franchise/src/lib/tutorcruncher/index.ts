// TutorCruncher Integration Module
export {
  TutorCruncherClient,
  createTCClient,
  createTCClientFromAccount,
} from './client';

export {
  syncFranchiseeMonth,
  syncAllFranchiseesMonth,
  syncCurrentMonth,
  syncPreviousMonth,
  calculateYTDRevenue,
  updateAllYTDRevenue,
  verifyTCCredentials,
} from './sync';

export {
  categorizeServiceType,
  calculateAppointmentRevenue,
  calculateDurationHours,
  aggregateRevenueByService,
  calculateTotalHours,
  getActiveStudentIds,
  getActiveTutorIds,
} from './revenue';

export type {
  ServiceType,
  TCAppointment,
  TCRcra,
  TCClient,
  TCContractor,
  TCInvoice,
  TCPaginatedResponse,
  TCMonthlySnapshot,
  TCInstance,
  RevenueByService,
} from './types';
