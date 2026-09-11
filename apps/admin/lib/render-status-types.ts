/**
 * Tipos para Approval Queue & Render Status
 * Alineados con rendering-engine y workflow orchestrator
 */

export type ApprovalStatus = 'pending' | 'in_review' | 'approved' | 'rejected' | 'needs_revision';

export type RenderStatus = 'queued' | 'rendering' | 'completed' | 'failed' | 'cancelled';

export type PublishStatus = 'draft' | 'scheduled' | 'published' | 'failed' | 'rollback';

export type ApprovalQueueItem = {
  id: string;
  request_id: string;
  tenant_slug: string;
  workflow_id: string;
  workflow_name: string;
  status: ApprovalStatus;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  reasoning: string | null;
  requester_email: string | null;
  reviewer_email: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  metadata: Record<string, unknown> | null;
};

export type RenderJob = {
  id: string;
  approval_id: string | null;
  tenant_slug: string;
  workflow_id: string;
  workflow_name: string;
  status: RenderStatus;
  progress: number; // 0-100
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  output_url: string | null;
  created_at: string;
};

export type PublishRecord = {
  id: string;
  render_id: string;
  approval_id: string | null;
  tenant_slug: string;
  workflow_id: string;
  workflow_name: string;
  status: PublishStatus;
  version: string;
  published_at: string | null;
  published_by: string | null;
  rollback_at: string | null;
  rollback_reason: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

export type ApprovalQueueResponse = {
  items: ApprovalQueueItem[];
  total: number;
  pending: number;
  in_review: number;
  approved: number;
  rejected: number;
  generated_at: string;
};

export type RenderMonitorResponse = {
  jobs: RenderJob[];
  total: number;
  active: number;
  completed_today: number;
  failed_today: number;
  avg_duration_seconds: number;
  generated_at: string;
};

export type PublishHistoryResponse = {
  records: PublishRecord[];
  total: number;
  published_today: number;
  failed_today: number;
  generated_at: string;
};
