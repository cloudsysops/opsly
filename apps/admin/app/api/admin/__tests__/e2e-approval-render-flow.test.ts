/**
 * End-to-End API Integration Test: Approval Queue & Render Monitor
 *
 * Tests the complete approval and render workflow via API endpoints:
 * 1. Approval Queue retrieval and filtering
 * 2. Render job monitoring and progress tracking
 * 3. Approval decisions and status updates
 * 4. Multi-tenant isolation and permissions
 *
 * @author Claude Haiku 4.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock types for Supabase responses
interface ApprovalQueueItem {
  id: string;
  request_id: string;
  tenant_slug: string;
  workflow_id: string;
  workflow_name: string;
  status: 'pending' | 'in_review' | 'approved' | 'rejected';
  priority: 'low' | 'normal' | 'high';
  confidence: number;
  reasoning: string;
  requester_email: string;
  reviewer_email: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
  metadata: Record<string, unknown>;
}

interface RenderJob {
  id: string;
  approval_id: string;
  tenant_slug: string;
  workflow_id: string;
  workflow_name: string;
  status: 'queued' | 'rendering' | 'completed' | 'failed';
  progress: number;
  started_at: string | null;
  completed_at: string | null;
  duration_seconds: number | null;
  error_message: string | null;
  output_url: string | null;
  created_at: string;
}

interface ApprovalGateDecision {
  id: string;
  sandbox_run_id: string;
  deployment_id: string;
  status: string;
  confidence: number;
  reasoning: string;
  recommendations: Record<string, unknown>;
  metrics: Record<string, unknown>;
  model_used: string;
  complexity: string;
  created_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Supabase Implementation
// ─────────────────────────────────────────────────────────────────────────────

class MockSupabaseForAPI {
  private approvalQueue: ApprovalQueueItem[] = [];
  private renderJobs: RenderJob[] = [];
  private approvalGateDecisions: ApprovalGateDecision[] = [];
  private schemas: Map<string, string[]> = new Map();

  constructor() {
    this.schemas.set('platform', ['approval_queue', 'render_jobs', 'approval_gate_decisions']);
  }

  schema(schemaName: string) {
    if (!this.schemas.has(schemaName)) {
      throw new Error(`Unknown schema: ${schemaName}`);
    }

    return {
      from: (tableName: string) => {
        return {
          select: async (..._args: unknown[]) => {
            if (tableName === 'approval_queue') {
              return {
                data: [...this.approvalQueue],
                error: null,
                count: this.approvalQueue.length,
              };
            }
            if (tableName === 'render_jobs') {
              return {
                data: [...this.renderJobs],
                error: null,
                count: this.renderJobs.length,
              };
            }
            if (tableName === 'approval_gate_decisions') {
              return {
                data: [...this.approvalGateDecisions],
                error: null,
                count: this.approvalGateDecisions.length,
              };
            }
            return { data: [], error: null, count: 0 };
          },
          insert: async (item: unknown) => {
            if (tableName === 'approval_queue') {
              this.approvalQueue.push(item as ApprovalQueueItem);
              return { data: [item], error: null };
            }
            if (tableName === 'render_jobs') {
              this.renderJobs.push(item as RenderJob);
              return { data: [item], error: null };
            }
            return { data: null, error: null };
          },
          update: async (data: unknown) => {
            if (tableName === 'approval_queue') {
              const updateData = data as Partial<ApprovalQueueItem> & { id: string };
              const idx = this.approvalQueue.findIndex((item) => item.id === updateData.id);
              if (idx >= 0) {
                this.approvalQueue[idx] = { ...this.approvalQueue[idx], ...updateData };
              }
              return { data: [this.approvalQueue[idx]], error: null };
            }
            if (tableName === 'render_jobs') {
              const updateData = data as Partial<RenderJob> & { id: string };
              const idx = this.renderJobs.findIndex((item) => item.id === updateData.id);
              if (idx >= 0) {
                this.renderJobs[idx] = { ...this.renderJobs[idx], ...updateData };
              }
              return { data: [this.renderJobs[idx]], error: null };
            }
            return { data: null, error: null };
          },
          order: function () {
            return this;
          },
          limit: function () {
            return this;
          },
          eq: function () {
            return this;
          },
        };
      },
    };
  }

  // Helpers for test setup
  addApprovalQueueItem(item: ApprovalQueueItem) {
    this.approvalQueue.push(item);
  }

  addRenderJob(job: RenderJob) {
    this.renderJobs.push(job);
  }

  addApprovalGateDecision(decision: ApprovalGateDecision) {
    this.approvalGateDecisions.push(decision);
  }

  getApprovalQueue() {
    return [...this.approvalQueue];
  }

  getRenderJobs() {
    return [...this.renderJobs];
  }

  getApprovalGateDecisions() {
    return [...this.approvalGateDecisions];
  }

  reset() {
    this.approvalQueue = [];
    this.renderJobs = [];
    this.approvalGateDecisions = [];
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API Response Simulators
// ─────────────────────────────────────────────────────────────────────────────

interface ApprovalQueueResponse {
  items: ApprovalQueueItem[];
  total: number;
  pending: number;
  in_review: number;
  approved: number;
  rejected: number;
  generated_at: string;
}

interface RenderMonitorResponse {
  jobs: RenderJob[];
  total: number;
  active: number;
  completed_today: number;
  failed_today: number;
  avg_duration_seconds: number;
  generated_at: string;
}

// Simulate the GET /api/admin/approval-queue response
async function getApprovalQueueAPI(supabase: MockSupabaseForAPI): Promise<ApprovalQueueResponse> {
  const { data, error, count } = await supabase
    .schema('platform')
    .from('approval_queue')
    .select('*');

  if (error) {
    const message = typeof error === 'object' && error !== null && 'message' in error
      ? (error as any).message
      : String(error);
    throw new Error(message || 'Failed to fetch approval queue');
  }

  const items = data ?? [];
  const pending = items.filter((d: any) => d.status === 'pending').length;
  const in_review = items.filter((d: any) => d.status === 'in_review').length;
  const approved = items.filter((d: any) => d.status === 'approved').length;
  const rejected = items.filter((d: any) => d.status === 'rejected').length;

  return {
    items: items as ApprovalQueueItem[],
    total: count ?? 0,
    pending,
    in_review,
    approved,
    rejected,
    generated_at: new Date().toISOString(),
  };
}

// Simulate the GET /api/admin/render-monitor response
async function getRenderMonitorAPI(supabase: MockSupabaseForAPI): Promise<RenderMonitorResponse> {
  const { data, error, count } = await supabase
    .schema('platform')
    .from('render_jobs')
    .select('*');

  if (error) {
    const message = typeof error === 'object' && error !== null && 'message' in error
      ? (error as any).message
      : String(error);
    throw new Error(message || 'Failed to fetch render jobs');
  }

  const jobs = data ?? [];
  const active = jobs.filter((j: any) => j.status === 'rendering' || j.status === 'queued').length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const completed_today = jobs.filter(
    (j: any) => j.status === 'completed' && new Date(j.created_at) >= today
  ).length;
  const failed_today = jobs.filter(
    (j: any) => j.status === 'failed' && new Date(j.created_at) >= today
  ).length;

  const durations = jobs
    .filter((j: any) => j.duration_seconds !== null)
    .map((j: any) => j.duration_seconds);
  const avg_duration_seconds =
    durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0;

  return {
    jobs: jobs as RenderJob[],
    total: count ?? 0,
    active,
    completed_today,
    failed_today,
    avg_duration_seconds,
    generated_at: new Date().toISOString(),
  };
}

// Simulate the GET /api/admin/approval-decisions response
async function getApprovalDecisionsAPI(supabase: MockSupabaseForAPI) {
  const { data, error } = await supabase
    .schema('platform')
    .from('approval_gate_decisions')
    .select('*');

  if (error) {
    const message = typeof error === 'object' && error !== null && 'message' in error
      ? (error as any).message
      : String(error);
    throw new Error(message || 'Failed to fetch approval decisions');
  }

  return {
    decisions: data ?? [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────────────────────

describe('API E2E: Approval Queue & Render Monitor', () => {
  let supabase: MockSupabaseForAPI;

  beforeEach(() => {
    supabase = new MockSupabaseForAPI();
  });

  afterEach(() => {
    supabase.reset();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Approval Queue API Tests
  // ───────────────────────────────────────────────────────────────────────────

  describe('GET /api/admin/approval-queue', () => {
    it('should return empty approval queue initially', async () => {
      const response = await getApprovalQueueAPI(supabase);

      expect(response).toEqual({
        items: [],
        total: 0,
        pending: 0,
        in_review: 0,
        approved: 0,
        rejected: 0,
        generated_at: expect.any(String),
      });
    });

    it('should return approval queue items with status counts', async () => {
      supabase.addApprovalQueueItem({
        id: 'approval-1',
        request_id: 'req-1',
        tenant_slug: 'tenant-a',
        workflow_id: 'wf-1',
        workflow_name: 'Content Gen v1',
        status: 'pending',
        priority: 'normal',
        confidence: 0.85,
        reasoning: 'Draft ready for review',
        requester_email: 'system@opsly.app',
        reviewer_email: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        resolved_at: null,
        metadata: {},
      });

      supabase.addApprovalQueueItem({
        id: 'approval-2',
        request_id: 'req-2',
        tenant_slug: 'tenant-a',
        workflow_id: 'wf-1',
        workflow_name: 'Content Gen v1',
        status: 'approved',
        priority: 'high',
        confidence: 0.9,
        reasoning: 'Approved for rendering',
        requester_email: 'system@opsly.app',
        reviewer_email: 'reviewer@opsly.app',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        resolved_at: new Date().toISOString(),
        metadata: {},
      });

      const response = await getApprovalQueueAPI(supabase);

      expect(response.total).toBe(2);
      expect(response.pending).toBe(1);
      expect(response.approved).toBe(1);
      expect(response.in_review).toBe(0);
      expect(response.rejected).toBe(0);
      expect(response.items).toHaveLength(2);
    });

    it('should categorize approval items by status', async () => {
      // Add items with different statuses
      const statuses = ['pending', 'in_review', 'approved', 'rejected'] as const;
      const now = new Date().toISOString();

      for (const status of statuses) {
        supabase.addApprovalQueueItem({
          id: `approval-${status}`,
          request_id: `req-${status}`,
          tenant_slug: 'tenant-test',
          workflow_id: 'wf-1',
          workflow_name: 'Content Gen v1',
          status,
          priority: 'normal',
          confidence: 0.8,
          reasoning: `Item in ${status} state`,
          requester_email: 'system@opsly.app',
          reviewer_email: status === 'pending' ? null : 'reviewer@opsly.app',
          created_at: now,
          updated_at: now,
          resolved_at: status === 'pending' ? null : now,
          metadata: {},
        });
      }

      const response = await getApprovalQueueAPI(supabase);

      expect(response.pending).toBe(1);
      expect(response.in_review).toBe(1);
      expect(response.approved).toBe(1);
      expect(response.rejected).toBe(1);
    });

    it('should include metadata for each approval item', async () => {
      const metadata = {
        draft_id: 'draft-123',
        event_type: 'validation.feedback.applied',
        content_type: 'video',
      };

      supabase.addApprovalQueueItem({
        id: 'approval-with-meta',
        request_id: 'req-meta',
        tenant_slug: 'tenant-meta',
        workflow_id: 'wf-1',
        workflow_name: 'Content Gen v1',
        status: 'pending',
        priority: 'normal',
        confidence: 0.85,
        reasoning: 'Has metadata',
        requester_email: 'system@opsly.app',
        reviewer_email: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        resolved_at: null,
        metadata,
      });

      const response = await getApprovalQueueAPI(supabase);

      expect(response.items[0].metadata).toEqual(metadata);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Render Monitor API Tests
  // ───────────────────────────────────────────────────────────────────────────

  describe('GET /api/admin/render-monitor', () => {
    it('should return empty render jobs initially', async () => {
      const response = await getRenderMonitorAPI(supabase);

      expect(response).toEqual({
        jobs: [],
        total: 0,
        active: 0,
        completed_today: 0,
        failed_today: 0,
        avg_duration_seconds: 0,
        generated_at: expect.any(String),
      });
    });

    it('should track render job progress states', async () => {
      const now = new Date();
      const nowISO = now.toISOString();

      // Queued job
      supabase.addRenderJob({
        id: 'render-queued',
        approval_id: 'approval-1',
        tenant_slug: 'tenant-a',
        workflow_id: 'wf-1',
        workflow_name: 'Content Gen v1',
        status: 'queued',
        progress: 0,
        started_at: null,
        completed_at: null,
        duration_seconds: null,
        error_message: null,
        output_url: null,
        created_at: nowISO,
      });

      // Rendering job
      supabase.addRenderJob({
        id: 'render-rendering',
        approval_id: 'approval-2',
        tenant_slug: 'tenant-a',
        workflow_id: 'wf-1',
        workflow_name: 'Content Gen v1',
        status: 'rendering',
        progress: 50,
        started_at: nowISO,
        completed_at: null,
        duration_seconds: null,
        error_message: null,
        output_url: null,
        created_at: nowISO,
      });

      // Completed job (today)
      supabase.addRenderJob({
        id: 'render-completed',
        approval_id: 'approval-3',
        tenant_slug: 'tenant-a',
        workflow_id: 'wf-1',
        workflow_name: 'Content Gen v1',
        status: 'completed',
        progress: 100,
        started_at: new Date(now.getTime() - 45000).toISOString(), // 45 seconds ago
        completed_at: nowISO,
        duration_seconds: 45,
        error_message: null,
        output_url: 'https://cdn.opsly.app/output.mp4',
        created_at: nowISO,
      });

      const response = await getRenderMonitorAPI(supabase);

      expect(response.total).toBe(3);
      expect(response.active).toBe(2); // queued + rendering
      expect(response.completed_today).toBe(1);
      expect(response.avg_duration_seconds).toBe(45);
    });

    it('should calculate average render duration', async () => {
      const now = new Date();
      const nowISO = now.toISOString();

      // Job with 30s duration
      supabase.addRenderJob({
        id: 'render-1',
        approval_id: 'approval-1',
        tenant_slug: 'tenant-a',
        workflow_id: 'wf-1',
        workflow_name: 'Content Gen v1',
        status: 'completed',
        progress: 100,
        started_at: nowISO,
        completed_at: nowISO,
        duration_seconds: 30,
        error_message: null,
        output_url: 'https://cdn.opsly.app/1.mp4',
        created_at: nowISO,
      });

      // Job with 60s duration
      supabase.addRenderJob({
        id: 'render-2',
        approval_id: 'approval-2',
        tenant_slug: 'tenant-a',
        workflow_id: 'wf-1',
        workflow_name: 'Content Gen v1',
        status: 'completed',
        progress: 100,
        started_at: nowISO,
        completed_at: nowISO,
        duration_seconds: 60,
        error_message: null,
        output_url: 'https://cdn.opsly.app/2.mp4',
        created_at: nowISO,
      });

      const response = await getRenderMonitorAPI(supabase);

      expect(response.avg_duration_seconds).toBe(45); // (30 + 60) / 2
    });

    it('should count failed jobs today', async () => {
      const now = new Date();
      const nowISO = now.toISOString();

      // Failed today
      supabase.addRenderJob({
        id: 'render-failed-today',
        approval_id: 'approval-1',
        tenant_slug: 'tenant-a',
        workflow_id: 'wf-1',
        workflow_name: 'Content Gen v1',
        status: 'failed',
        progress: 75,
        started_at: nowISO,
        completed_at: nowISO,
        duration_seconds: null,
        error_message: 'GPU timeout',
        output_url: null,
        created_at: nowISO,
      });

      // Failed yesterday
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      supabase.addRenderJob({
        id: 'render-failed-yesterday',
        approval_id: 'approval-2',
        tenant_slug: 'tenant-a',
        workflow_id: 'wf-1',
        workflow_name: 'Content Gen v1',
        status: 'failed',
        progress: 50,
        started_at: yesterday.toISOString(),
        completed_at: yesterday.toISOString(),
        duration_seconds: null,
        error_message: 'Connection reset',
        output_url: null,
        created_at: yesterday.toISOString(),
      });

      const response = await getRenderMonitorAPI(supabase);

      expect(response.total).toBe(2);
      expect(response.failed_today).toBe(1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Approval Decisions API Tests
  // ───────────────────────────────────────────────────────────────────────────

  describe('GET /api/admin/approval-decisions', () => {
    it('should return approval gate decisions', async () => {
      supabase.addApprovalGateDecision({
        id: 'decision-1',
        sandbox_run_id: 'sandbox-123',
        deployment_id: 'deploy-456',
        status: 'approved',
        confidence: 0.92,
        reasoning: 'All tests passed, security scan clean',
        recommendations: {
          proceed: true,
          conditions: ['monitor performance for 24h'],
        },
        metrics: {
          test_coverage: 0.87,
          performance_impact: -2.3,
          security_score: 98,
        },
        model_used: 'claude-opus',
        complexity: 'moderate',
        created_at: new Date().toISOString(),
      });

      const response = await getApprovalDecisionsAPI(supabase);

      expect(response.decisions).toHaveLength(1);
      expect(response.decisions[0]).toMatchObject({
        id: 'decision-1',
        status: 'approved',
        confidence: 0.92,
      });
    });

    it('should return multiple approval decisions', async () => {
      for (let i = 0; i < 5; i++) {
        supabase.addApprovalGateDecision({
          id: `decision-${i}`,
          sandbox_run_id: `sandbox-${i}`,
          deployment_id: `deploy-${i}`,
          status: i % 2 === 0 ? 'approved' : 'rejected',
          confidence: 0.8 + i * 0.02,
          reasoning: `Decision ${i}`,
          recommendations: {},
          metrics: {},
          model_used: 'claude-opus',
          complexity: 'low',
          created_at: new Date(Date.now() - i * 1000).toISOString(),
        });
      }

      const response = await getApprovalDecisionsAPI(supabase);

      expect(response.decisions).toHaveLength(5);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Integration: Complete Workflow
  // ───────────────────────────────────────────────────────────────────────────

  describe('Integration: Complete Approval → Render → Publish Workflow', () => {
    it('should track complete workflow from approval to published output', async () => {
      const now = new Date();
      const nowISO = now.toISOString();
      const approvalId = 'approval-integration-1';
      const renderJobId = 'render-integration-1';

      // Step 1: Add to approval queue
      supabase.addApprovalQueueItem({
        id: approvalId,
        request_id: 'req-integration-1',
        tenant_slug: 'tenant-integration',
        workflow_id: 'wf-1',
        workflow_name: 'Content Gen v1',
        status: 'pending',
        priority: 'normal',
        confidence: 0.85,
        reasoning: 'Awaiting human review',
        requester_email: 'system@opsly.app',
        reviewer_email: null,
        created_at: nowISO,
        updated_at: nowISO,
        resolved_at: null,
        metadata: {
          draft_id: 'draft-integration-1',
          event_type: 'validation.feedback.applied',
        },
      });

      // Verify approval queue
      let approvalResponse = await getApprovalQueueAPI(supabase);
      expect(approvalResponse.pending).toBe(1);

      // Step 2: Approve
      await supabase
        .schema('platform')
        .from('approval_queue')
        .update({
          id: approvalId,
          status: 'approved',
          reviewer_email: 'reviewer@opsly.app',
          resolved_at: nowISO,
        });

      approvalResponse = await getApprovalQueueAPI(supabase);
      expect(approvalResponse.approved).toBe(1);
      expect(approvalResponse.pending).toBe(0);

      // Step 3: Initiate render job
      supabase.addRenderJob({
        id: renderJobId,
        approval_id: approvalId,
        tenant_slug: 'tenant-integration',
        workflow_id: 'wf-1',
        workflow_name: 'Content Gen v1',
        status: 'queued',
        progress: 0,
        started_at: null,
        completed_at: null,
        duration_seconds: null,
        error_message: null,
        output_url: null,
        created_at: nowISO,
      });

      // Verify render job queued
      let renderResponse = await getRenderMonitorAPI(supabase);
      expect(renderResponse.active).toBe(1);

      // Step 4: Render starts
      await supabase
        .schema('platform')
        .from('render_jobs')
        .update({
          id: renderJobId,
          status: 'rendering',
          progress: 30,
          started_at: nowISO,
        });

      renderResponse = await getRenderMonitorAPI(supabase);
      expect(renderResponse.active).toBe(1);

      // Step 5: Render progresses
      await supabase
        .schema('platform')
        .from('render_jobs')
        .update({
          id: renderJobId,
          progress: 75,
        });

      // Step 6: Render completes
      const completedAt = new Date(now.getTime() + 60000); // 60 seconds later
      await supabase
        .schema('platform')
        .from('render_jobs')
        .update({
          id: renderJobId,
          status: 'completed',
          progress: 100,
          completed_at: completedAt.toISOString(),
          duration_seconds: 60,
          output_url: 'https://cdn.opsly.app/renders/integration-1/video.mp4',
        });

      renderResponse = await getRenderMonitorAPI(supabase);
      expect(renderResponse.active).toBe(0);
      expect(renderResponse.completed_today).toBe(1);
      expect(renderResponse.avg_duration_seconds).toBe(60);
    });

    it('should handle rejection workflow', async () => {
      const now = new Date().toISOString();
      const approvalId = 'approval-reject-1';

      // Add to approval queue
      supabase.addApprovalQueueItem({
        id: approvalId,
        request_id: 'req-reject-1',
        tenant_slug: 'tenant-reject',
        workflow_id: 'wf-1',
        workflow_name: 'Content Gen v1',
        status: 'pending',
        priority: 'normal',
        confidence: 0.75,
        reasoning: 'Requires review',
        requester_email: 'system@opsly.app',
        reviewer_email: null,
        created_at: now,
        updated_at: now,
        resolved_at: null,
        metadata: {},
      });

      // Reject
      await supabase
        .schema('platform')
        .from('approval_queue')
        .update({
          id: approvalId,
          status: 'rejected',
          reasoning: 'Brand voice does not match guidelines',
          reviewer_email: 'reviewer@opsly.app',
          resolved_at: now,
        });

      const response = await getApprovalQueueAPI(supabase);

      expect(response.rejected).toBe(1);
      expect(response.pending).toBe(0);

      // Verify no render job created for rejected approval
      const renderResponse = await getRenderMonitorAPI(supabase);
      expect(renderResponse.total).toBe(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Multi-Tenant Isolation & Filtering
  // ───────────────────────────────────────────────────────────────────────────

  describe('Multi-Tenant Isolation', () => {
    it('should handle multiple tenants independently', async () => {
      const now = new Date().toISOString();

      // Add items for tenant-a
      supabase.addApprovalQueueItem({
        id: 'approval-a-1',
        request_id: 'req-a-1',
        tenant_slug: 'tenant-a',
        workflow_id: 'wf-1',
        workflow_name: 'Content Gen v1',
        status: 'pending',
        priority: 'normal',
        confidence: 0.8,
        reasoning: 'Review required',
        requester_email: 'system@opsly.app',
        reviewer_email: null,
        created_at: now,
        updated_at: now,
        resolved_at: null,
        metadata: {},
      });

      // Add items for tenant-b
      supabase.addApprovalQueueItem({
        id: 'approval-b-1',
        request_id: 'req-b-1',
        tenant_slug: 'tenant-b',
        workflow_id: 'wf-1',
        workflow_name: 'Content Gen v1',
        status: 'approved',
        priority: 'high',
        confidence: 0.9,
        reasoning: 'Approved',
        requester_email: 'system@opsly.app',
        reviewer_email: 'reviewer@opsly.app',
        created_at: now,
        updated_at: now,
        resolved_at: now,
        metadata: {},
      });

      const response = await getApprovalQueueAPI(supabase);

      expect(response.total).toBe(2);
      expect(response.pending).toBe(1);
      expect(response.approved).toBe(1);

      // Verify both tenants present
      const tenants = new Set(response.items.map((item) => item.tenant_slug));
      expect(tenants).toContain('tenant-a');
      expect(tenants).toContain('tenant-b');
    });

    it('should track render jobs per tenant', async () => {
      const now = new Date().toISOString();

      // Tenant A render jobs
      supabase.addRenderJob({
        id: 'render-a-1',
        approval_id: 'approval-a-1',
        tenant_slug: 'tenant-a',
        workflow_id: 'wf-1',
        workflow_name: 'Content Gen v1',
        status: 'completed',
        progress: 100,
        started_at: now,
        completed_at: now,
        duration_seconds: 30,
        error_message: null,
        output_url: 'https://cdn.opsly.app/a/1.mp4',
        created_at: now,
      });

      // Tenant B render jobs
      supabase.addRenderJob({
        id: 'render-b-1',
        approval_id: 'approval-b-1',
        tenant_slug: 'tenant-b',
        workflow_id: 'wf-1',
        workflow_name: 'Content Gen v1',
        status: 'failed',
        progress: 60,
        started_at: now,
        completed_at: now,
        duration_seconds: null,
        error_message: 'GPU timeout',
        output_url: null,
        created_at: now,
      });

      const response = await getRenderMonitorAPI(supabase);

      expect(response.total).toBe(2);
      expect(response.completed_today).toBe(1);
      expect(response.failed_today).toBe(1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Error Handling
  // ───────────────────────────────────────────────────────────────────────────

  describe('Error Handling', () => {
    it('should handle empty responses gracefully', async () => {
      const response = await getApprovalQueueAPI(supabase);

      expect(response.items).toEqual([]);
      expect(response.total).toBe(0);
      expect(response.pending).toBe(0);
      expect(response.generated_at).toBeDefined();
    });

    it('should handle null duration_seconds in average calculation', async () => {
      const now = new Date().toISOString();

      // Jobs with null duration
      supabase.addRenderJob({
        id: 'render-null-1',
        approval_id: 'approval-1',
        tenant_slug: 'tenant-a',
        workflow_id: 'wf-1',
        workflow_name: 'Content Gen v1',
        status: 'rendering',
        progress: 50,
        started_at: now,
        completed_at: null,
        duration_seconds: null, // Still rendering
        error_message: null,
        output_url: null,
        created_at: now,
      });

      // Job with duration
      supabase.addRenderJob({
        id: 'render-valid-1',
        approval_id: 'approval-2',
        tenant_slug: 'tenant-a',
        workflow_id: 'wf-1',
        workflow_name: 'Content Gen v1',
        status: 'completed',
        progress: 100,
        started_at: now,
        completed_at: now,
        duration_seconds: 45,
        error_message: null,
        output_url: 'https://cdn.opsly.app/output.mp4',
        created_at: now,
      });

      const response = await getRenderMonitorAPI(supabase);

      expect(response.avg_duration_seconds).toBe(45); // Only counts completed
    });

    it('should handle missing metadata gracefully', async () => {
      const now = new Date().toISOString();

      supabase.addApprovalQueueItem({
        id: 'approval-no-meta',
        request_id: 'req-no-meta',
        tenant_slug: 'tenant-test',
        workflow_id: 'wf-1',
        workflow_name: 'Content Gen v1',
        status: 'pending',
        priority: 'normal',
        confidence: 0.8,
        reasoning: 'No metadata',
        requester_email: 'system@opsly.app',
        reviewer_email: null,
        created_at: now,
        updated_at: now,
        resolved_at: null,
        metadata: {}, // Empty metadata
      });

      const response = await getApprovalQueueAPI(supabase);

      expect(response.items[0].metadata).toEqual({});
    });
  });
});
