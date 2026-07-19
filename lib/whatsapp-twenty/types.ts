/**
 * Twenty CRM Integration Types
 */

export interface TwentyPerson {
  id: string;
  firstName: string;
  lastName?: string;
  email?: string;
  phone: string;
  linkedinProfile?: string;
  xProfile?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TwentyOpportunity {
  id: string;
  name: string;
  description?: string;
  stage: string;
  amount?: number;
  closeDate?: string;
  personId: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TwentySyncResult {
  ok: boolean;
  personId?: string;
  opportunityId?: string;
  error?: string;
  message?: string;
  details?: Record<string, unknown>;
}

export interface TwentyRetryRecord {
  id: string;
  leadId: string;
  personId?: string;
  opportunityId?: string;
  syncType: 'person' | 'opportunity';
  status: 'pending' | 'retry' | 'failed' | 'succeeded';
  attemptCount: number;
  lastError?: string;
  nextRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
