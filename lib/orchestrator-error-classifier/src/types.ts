/**
 * Error categories for agent execution
 * Used to determine repair strategy and recovery behavior
 */
export type ErrorCategory =
  | 'credits_exhausted'    // Tenant ran out of credits/budget
  | 'rate_limit'           // Rate limit exceeded (provider or internal)
  | 'timeout'              // Job exceeded time limit
  | 'config_error'         // Misconfiguration (credentials, settings)
  | 'provider_error'       // External provider error (temporary)
  | 'irrecuperable'        // Fatal error, cannot be recovered
  | 'unknown';             // Unclassified error

/**
 * Strategy for handling classified errors
 */
export type RepairStrategy =
  | 'auto_retry'           // Automatically retry (BullMQ handles)
  | 'operator_review'      // Requires human intervention
  | 'fail_fast'            // Do not retry, fail immediately
  | 'exponential_backoff'; // Retry with exponential backoff

/**
 * Result of error classification
 */
export interface ClassifiedError {
  category: ErrorCategory;
  strategy: RepairStrategy;
  message: string;
  isRecoverable: boolean;
  suggestedAction: string;
  priority: 'critical' | 'high' | 'normal' | 'low';
  metadata: Record<string, unknown>;
  confidence: number; // 0.0 to 1.0
}

/**
 * Configuration for error classification rules
 */
export interface ClassificationRule {
  id: string;
  name: string;
  pattern: RegExp | string;
  category: ErrorCategory;
  strategy: RepairStrategy;
  priority: 'critical' | 'high' | 'normal' | 'low';
  maxRetries?: number;
  backoffMs?: number;
  isRecoverable: boolean;
  suggestedAction: string;
  tags: string[];
}

/**
 * Error context for classification
 */
export interface ErrorContext {
  tenant_slug: string;
  job_type?: string;
  worker?: string;
  provider?: string;
  statusCode?: number;
  errorCode?: string;
  timestamp: number;
  retryCount?: number;
}

/**
 * Repair job metadata
 */
export interface RepairJobMetadata {
  originalJobId: string;
  originalJobType: string;
  category: ErrorCategory;
  originalError: string;
  suggestedAction: string;
  timestamp: number;
  repairAttempt: number;
  maxRepairAttempts: number;
  contextSnapshot: Record<string, unknown>;
}

/**
 * Configuration for error classifier
 */
export interface ErrorClassifierConfig {
  enableRepairQueue: boolean;
  maxRepairAttempts: number;
  repairQueueName: string;
  defaultStrategy: RepairStrategy;
  customRules?: ClassificationRule[];
}
