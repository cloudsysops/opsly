export type SalesIntent = 'diagnose' | 'recommend' | 'book' | 'upsell' | 'none';

export type CloudSysOpsServiceType = 'pc-cleanup' | 'gaming-optimization' | 'office-support';

export type UrgencyLevel = 'high' | 'medium' | 'low';

export interface SalesBookingData {
  serviceType: CloudSysOpsServiceType;
  suggestedPrice: 149 | 199 | 299;
  urgency: UrgencyLevel;
}

export interface SalesAgentInput {
  message: string;
  customerId: string;
  tenantId: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  /** Texto opcional (p. ej. desde Context Builder). */
  contextBlock?: string;
}

export interface SalesAgentOutput {
  response: string;
  intent: SalesIntent;
  bookingData?: SalesBookingData;
  nextAction: string;
}

export interface OpsAgentInput {
  bookingId: string;
  tenantId: string;
  serviceType: string;
  findings: string;
  actionsPerformed: string;
  metricsBeforeAfter: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
  customerSatisfaction: number;
}

export interface OpsReportContent {
  findings: string;
  actions: string;
  results: string;
  recommendations: string;
}

export interface OpsFollowUpSchedule {
  thirtyDays: string;
  sixtyDays: string;
  ninetyDays: string;
}

export interface OpsAgentOutput {
  reportContent: OpsReportContent;
  upsellSuggestion: string;
  followUpSchedule: OpsFollowUpSchedule;
  nextMaintenanceDate: string;
}
