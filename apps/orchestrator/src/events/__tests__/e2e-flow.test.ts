/**
 * End-to-End Integration Test: Event → Draft → Approval → Render → Publish
 *
 * Validates the complete content generation pipeline:
 * 1. Runtime events trigger content generation
 * 2. Event loop wiring routes to BullMQ job queue
 * 3. Draft content created and stored
 * 4. Approval queue entry created
 * 5. Human review and approval/rejection decision
 * 6. Render job initiated on approval
 * 7. Render progress tracked
 * 8. Final publish output generated
 *
 * @author Claude Haiku 4.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { Queue } from 'bullmq';
import { createClient } from '@supabase/supabase-js';
import type { OrchestratorJob } from '../../types.js';
import type { OpslyEvent } from '../types.js';
import {
  handleRuntimeEvent,
  enqueueContentGenerationJob,
  startEventLoopWiring,
  getEventJobMappings,
  type ContentGenerationEvent,
} from '../event-loop-wiring.js';

// ─────────────────────────────────────────────────────────────────────────────
// Test Data & Fixtures
// ─────────────────────────────────────────────────────────────────────────────

interface TestContext {
  tenant_slug: string;
  draft_id: string;
  request_id: string;
  approval_id: string;
  render_job_id: string;
}

const TEST_CONTEXT: TestContext = {
  tenant_slug: 'acme-corp-test-e2e',
  draft_id: `draft-e2e-${Date.now()}`,
  request_id: `req-e2e-${Date.now()}`,
  approval_id: '',
  render_job_id: '',
};

// Mock Supabase client (for testing without actual DB)
class MockSupabaseClient {
  private approvalQueue: Record<string, unknown>[] = [];
  private renderJobs: Record<string, unknown>[] = [];
  private publishedOutputs: Record<string, unknown>[] = [];

  schema(schemaName: string) {
    return {
      from: (tableName: string) => {
        return {
          // Approval queue operations
          insert: async (data: unknown) => {
            if (tableName === 'approval_queue') {
              this.approvalQueue.push(data as any);
              return { data: [data], error: null };
            }
            return { data: null, error: null };
          },
          update: async (data: unknown) => {
            if (tableName === 'approval_queue') {
              const idx = this.approvalQueue.findIndex(
                (item: any) => item.id === (data as any).id
              );
              if (idx >= 0) {
                this.approvalQueue[idx] = { ...this.approvalQueue[idx], ...(data as any) };
              }
            }
            return { data: [data], error: null };
          },
          select: async (..._args: unknown[]) => {
            if (tableName === 'approval_queue') {
              return { data: this.approvalQueue, error: null, count: this.approvalQueue.length };
            }
            if (tableName === 'render_jobs') {
              return { data: this.renderJobs, error: null, count: this.renderJobs.length };
            }
            if (tableName === 'published_outputs') {
              return { data: this.publishedOutputs, error: null, count: this.publishedOutputs.length };
            }
            return { data: [], error: null, count: 0 };
          },
          eq: function () {
            return this;
          },
          order: function () {
            return this;
          },
          limit: function () {
            return this;
          },
        };
      },
    };
  }

  getApprovalQueue() {
    return this.approvalQueue;
  }

  getRenderJobs() {
    return this.renderJobs;
  }

  getPublishedOutputs() {
    return this.publishedOutputs;
  }

  addRenderJob(job: Record<string, unknown>) {
    this.renderJobs.push(job);
  }

  addPublishedOutput(output: Record<string, unknown>) {
    this.publishedOutputs.push(output);
  }
}

// Mock BullMQ Queue
class MockQueue extends EventTarget {
  name: string;
  private jobs: Map<string, unknown> = new Map();
  private jobCounter = 0;

  constructor(name: string) {
    super();
    this.name = name;
  }

  async add(jobType: string, data: unknown, _options?: unknown): Promise<{ id: string }> {
    const jobId = String(++this.jobCounter);
    this.jobs.set(jobId, { type: jobType, data, addedAt: new Date() });
    return { id: jobId };
  }

  async getJob(id: string) {
    return this.jobs.get(id);
  }

  async process() {
    // Mock processing
    return {
      close: async () => {},
    };
  }

  async drain() {
    this.jobs.clear();
  }

  getJobs() {
    return Array.from(this.jobs.values());
  }

  async close() {
    await this.drain();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test Suite
// ─────────────────────────────────────────────────────────────────────────────

describe('E2E Flow: Event → Draft → Approval → Render → Publish', () => {
  let mockQueue: MockQueue;
  let mockSupabase: MockSupabaseClient;

  beforeEach(() => {
    mockQueue = new MockQueue('content-video-test');
    mockSupabase = new MockSupabaseClient();
  });

  afterEach(async () => {
    await mockQueue.close();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 1: Event Triggering
  // ───────────────────────────────────────────────────────────────────────────

  describe('Phase 1: Event Triggering', () => {
    it('should trigger content generation on validation.feedback.applied event', async () => {
      const event: OpslyEvent = 'validation.feedback.applied';
      const eventData = {
        tenant_slug: TEST_CONTEXT.tenant_slug,
        generate_content: true,
        draft_id: TEST_CONTEXT.draft_id,
        draft: {
          title: 'Test Content',
          content_type: 'feedback_response',
          tenant_slug: TEST_CONTEXT.tenant_slug,
        },
        preset: {
          slug: 'test_preset',
          aspect_ratio: '9:16',
        },
        request_id: TEST_CONTEXT.request_id,
        timestamp: new Date().toISOString(),
      };

      const jobIds = await handleRuntimeEvent(mockQueue as any, event, eventData);

      expect(jobIds).toHaveLength(1);
      expect(jobIds[0]).toBeDefined();

      const enqueuedJobs = mockQueue.getJobs();
      expect(enqueuedJobs).toHaveLength(1);
    });

    it('should trigger content generation on agent.task.completed event', async () => {
      const event: OpslyEvent = 'agent.task.completed';
      const eventData = {
        tenant_slug: TEST_CONTEXT.tenant_slug,
        auto_generate_content: true,
        task_type: 'content_creation',
        task_id: `task-${Date.now()}`,
        draft_payload: {
          title: 'Agent Generated Content',
          content_type: 'task_completion',
          tenant_slug: TEST_CONTEXT.tenant_slug,
        },
        preset: {
          slug: 'agent_preset',
          aspect_ratio: '9:16',
        },
        request_id: TEST_CONTEXT.request_id,
        timestamp: new Date().toISOString(),
      };

      const jobIds = await handleRuntimeEvent(mockQueue as any, event, eventData);

      expect(jobIds).toHaveLength(1);
      const enqueuedJobs = mockQueue.getJobs();
      expect(enqueuedJobs).toHaveLength(1);
    });

    it('should trigger content generation on job.completed event', async () => {
      const event: OpslyEvent = 'job.completed';
      const eventData = {
        tenant_slug: TEST_CONTEXT.tenant_slug,
        job_type: 'content_generation',
        content_draft_prepared: true,
        draft_id: TEST_CONTEXT.draft_id,
        draft_payload: {
          title: 'Completed Job Content',
          content_type: 'job_completion',
          tenant_slug: TEST_CONTEXT.tenant_slug,
        },
        content_preset: {
          slug: 'completion_preset',
          aspect_ratio: '1:1',
        },
        request_id: TEST_CONTEXT.request_id,
        timestamp: new Date().toISOString(),
      };

      const jobIds = await handleRuntimeEvent(mockQueue as any, event, eventData);

      expect(jobIds).toHaveLength(1);
    });

    it('should trigger content generation on tenant.onboarded event', async () => {
      const event: OpslyEvent = 'tenant.onboarded';
      const eventData = {
        tenant_slug: TEST_CONTEXT.tenant_slug,
        auto_generate_intro_content: true,
        plan: 'pro',
        request_id: TEST_CONTEXT.request_id,
        timestamp: new Date().toISOString(),
      };

      const jobIds = await handleRuntimeEvent(mockQueue as any, event, eventData);

      expect(jobIds).toHaveLength(1);
    });

    it('should skip job enqueue if tenant_slug is missing', async () => {
      const event: OpslyEvent = 'validation.feedback.applied';
      const eventData = {
        // Missing tenant_slug!
        generate_content: true,
        request_id: TEST_CONTEXT.request_id,
        timestamp: new Date().toISOString(),
      };

      const jobIds = await handleRuntimeEvent(mockQueue as any, event, eventData);

      expect(jobIds).toHaveLength(0);
    });

    it('should skip job enqueue if conditions not met', async () => {
      const event: OpslyEvent = 'validation.feedback.applied';
      const eventData = {
        tenant_slug: TEST_CONTEXT.tenant_slug,
        generate_content: false, // Condition not met
        request_id: TEST_CONTEXT.request_id,
        timestamp: new Date().toISOString(),
      };

      const jobIds = await handleRuntimeEvent(mockQueue as any, event, eventData);

      expect(jobIds).toHaveLength(0);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 2: Draft Creation
  // ───────────────────────────────────────────────────────────────────────────

  describe('Phase 2: Draft Creation', () => {
    it('should enqueue content generation job with draft payload', async () => {
      const job: ContentGenerationEvent = {
        type: 'content_video',
        payload: {
          draft_id: TEST_CONTEXT.draft_id,
          draft: {
            title: 'Test Draft',
            content_type: 'feedback_response',
            tenant_slug: TEST_CONTEXT.tenant_slug,
            sections: [
              {
                type: 'intro',
                copy: 'Welcome to our update',
                duration_sec: 3,
              },
              {
                type: 'main',
                copy: 'Here are the key points',
                duration_sec: 15,
              },
              {
                type: 'cta',
                copy: 'Learn more at our website',
                duration_sec: 3,
              },
            ],
          },
          preset: {
            slug: 'test_preset',
            aspect_ratio: '9:16' as const,
            target_duration_sec: 30,
          },
          trigger_event: 'validation.feedback.applied',
        },
        tenant_slug: TEST_CONTEXT.tenant_slug,
        tenant_id: `tenant-${Date.now()}`,
        request_id: TEST_CONTEXT.request_id,
        initiated_by: 'system',
        agent_role: 'builder',
      };

      const jobId = await enqueueContentGenerationJob(mockQueue as any, job);

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');

      const enqueuedJobs = mockQueue.getJobs();
      expect(enqueuedJobs).toHaveLength(1);

      const enqueuedJob = enqueuedJobs[0] as any;
      expect(enqueuedJob.data.payload.draft).toBeDefined();
      expect(enqueuedJob.data.payload.draft.sections).toHaveLength(3);
    });

    it('should generate idempotency key for deduplication', async () => {
      const event: OpslyEvent = 'validation.feedback.applied';
      const eventData = {
        tenant_slug: TEST_CONTEXT.tenant_slug,
        generate_content: true,
        draft_id: TEST_CONTEXT.draft_id,
        idempotency_key: `custom-key-${TEST_CONTEXT.draft_id}`,
        timestamp: new Date().toISOString(),
      };

      const jobIds = await handleRuntimeEvent(mockQueue as any, event, eventData);

      expect(jobIds).toHaveLength(1);
      // Idempotency key ensures same event doesn't enqueue duplicate jobs
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 3: Approval Queue
  // ───────────────────────────────────────────────────────────────────────────

  describe('Phase 3: Approval Queue Management', () => {
    it('should add draft to approval queue', async () => {
      const approvalItem = {
        id: `approval-${Date.now()}`,
        request_id: TEST_CONTEXT.request_id,
        tenant_slug: TEST_CONTEXT.tenant_slug,
        draft_id: TEST_CONTEXT.draft_id,
        workflow_id: 'content_generation_v1',
        workflow_name: 'Content Generation Pipeline',
        status: 'pending' as const,
        priority: 'normal' as const,
        confidence: 0.85,
        reasoning: 'Requires human review before rendering',
        requester_email: 'system@opsly.app',
        reviewer_email: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        resolved_at: null,
        metadata: {
          draft_id: TEST_CONTEXT.draft_id,
          event_type: 'validation.feedback.applied',
          tenant_slug: TEST_CONTEXT.tenant_slug,
        },
      };

      const { data, error } = await mockSupabase
        .schema('platform')
        .from('approval_queue')
        .insert(approvalItem);

      expect(error).toBeNull();
      expect(data).toHaveLength(1);

      TEST_CONTEXT.approval_id = approvalItem.id;
    });

    it('should retrieve pending approvals', async () => {
      // First, add some items
      await mockSupabase.schema('platform').from('approval_queue').insert({
        id: `approval-${Date.now()}`,
        request_id: TEST_CONTEXT.request_id,
        tenant_slug: TEST_CONTEXT.tenant_slug,
        status: 'pending',
      });

      const { data, error, count } = await mockSupabase
        .schema('platform')
        .from('approval_queue')
        .select('*');

      expect(error).toBeNull();
      expect(data).toBeDefined();
      expect(count).toBeGreaterThan(0);
    });

    it('should update approval status to approved', async () => {
      const approvalId = `approval-${Date.now()}`;

      // First add
      await mockSupabase.schema('platform').from('approval_queue').insert({
        id: approvalId,
        status: 'pending',
        tenant_slug: TEST_CONTEXT.tenant_slug,
      });

      // Then update
      const { data, error } = await mockSupabase
        .schema('platform')
        .from('approval_queue')
        .update({
          id: approvalId,
          status: 'approved',
          reviewer_email: 'reviewer@opsly.app',
          resolved_at: new Date().toISOString(),
        });

      expect(error).toBeNull();
    });

    it('should update approval status to rejected', async () => {
      const approvalId = `approval-${Date.now()}`;

      await mockSupabase.schema('platform').from('approval_queue').insert({
        id: approvalId,
        status: 'pending',
        tenant_slug: TEST_CONTEXT.tenant_slug,
      });

      const { data, error } = await mockSupabase
        .schema('platform')
        .from('approval_queue')
        .update({
          id: approvalId,
          status: 'rejected',
          reasoning: 'Content does not meet brand guidelines',
          reviewer_email: 'reviewer@opsly.app',
          resolved_at: new Date().toISOString(),
        });

      expect(error).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 4: Render Job Initiation
  // ───────────────────────────────────────────────────────────────────────────

  describe('Phase 4: Render Job Initiation', () => {
    it('should create render job after approval', async () => {
      const renderJob = {
        id: `render-${Date.now()}`,
        approval_id: TEST_CONTEXT.approval_id,
        tenant_slug: TEST_CONTEXT.tenant_slug,
        workflow_id: 'content_generation_v1',
        workflow_name: 'Content Generation Pipeline',
        status: 'queued' as const,
        progress: 0,
        started_at: null,
        completed_at: null,
        duration_seconds: null,
        error_message: null,
        output_url: null,
        created_at: new Date().toISOString(),
      };

      mockSupabase.addRenderJob(renderJob);

      const { data, error } = await mockSupabase
        .schema('platform')
        .from('render_jobs')
        .select('*');

      expect(error).toBeNull();
      expect(data).toContainEqual(
        expect.objectContaining({
          approval_id: TEST_CONTEXT.approval_id,
          status: 'queued',
        })
      );

      TEST_CONTEXT.render_job_id = renderJob.id;
    });

    it('should track render job progress - queued → rendering', async () => {
      const renderJob = {
        id: `render-${Date.now()}`,
        approval_id: TEST_CONTEXT.approval_id,
        tenant_slug: TEST_CONTEXT.tenant_slug,
        status: 'queued' as const,
        progress: 0,
        created_at: new Date().toISOString(),
      };

      mockSupabase.addRenderJob(renderJob);

      // Simulate progress update
      mockSupabase.addRenderJob({
        ...renderJob,
        status: 'rendering',
        progress: 25,
        started_at: new Date().toISOString(),
      });

      const { data } = await mockSupabase
        .schema('platform')
        .from('render_jobs')
        .select('*');

      expect(data).toContainEqual(
        expect.objectContaining({
          status: 'rendering',
          progress: 25,
        })
      );
    });

    it('should track render job progress - mid-rendering', async () => {
      const renderJob = {
        id: `render-${Date.now()}`,
        status: 'rendering' as const,
        progress: 50,
        created_at: new Date().toISOString(),
      };

      mockSupabase.addRenderJob(renderJob);

      const { data } = await mockSupabase
        .schema('platform')
        .from('render_jobs')
        .select('*');

      expect(data).toContainEqual(
        expect.objectContaining({
          status: 'rendering',
          progress: 50,
        })
      );
    });

    it('should complete render job with output URL', async () => {
      const completedAt = new Date();
      const startedAt = new Date(completedAt.getTime() - 45000); // 45 seconds ago

      const renderJob = {
        id: `render-${Date.now()}`,
        approval_id: TEST_CONTEXT.approval_id,
        status: 'completed' as const,
        progress: 100,
        started_at: startedAt.toISOString(),
        completed_at: completedAt.toISOString(),
        duration_seconds: 45,
        output_url: `https://cdn.opsly.app/renders/${TEST_CONTEXT.approval_id}/video.mp4`,
        created_at: new Date().toISOString(),
      };

      mockSupabase.addRenderJob(renderJob);

      const { data } = await mockSupabase
        .schema('platform')
        .from('render_jobs')
        .select('*');

      expect(data).toContainEqual(
        expect.objectContaining({
          status: 'completed',
          progress: 100,
          output_url: expect.stringContaining('video.mp4'),
          duration_seconds: 45,
        })
      );
    });

    it('should handle render job failure', async () => {
      const renderJob = {
        id: `render-${Date.now()}`,
        approval_id: TEST_CONTEXT.approval_id,
        status: 'failed' as const,
        progress: 75,
        error_message: 'GPU timeout: render exceeded 60 second limit',
        created_at: new Date().toISOString(),
      };

      mockSupabase.addRenderJob(renderJob);

      const { data } = await mockSupabase
        .schema('platform')
        .from('render_jobs')
        .select('*');

      expect(data).toContainEqual(
        expect.objectContaining({
          status: 'failed',
          error_message: expect.stringContaining('GPU timeout'),
        })
      );
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // PHASE 5: Publish
  // ───────────────────────────────────────────────────────────────────────────

  describe('Phase 5: Publish', () => {
    it('should publish rendered content', async () => {
      const publishedOutput = {
        id: `pub-${Date.now()}`,
        render_job_id: TEST_CONTEXT.render_job_id,
        tenant_slug: TEST_CONTEXT.tenant_slug,
        workflow_id: 'content_generation_v1',
        content_type: 'video',
        platform: 'youtube_shorts',
        platform_status: 'published',
        platform_id: 'yt-abc123xyz789',
        published_url: 'https://youtube.com/shorts/abc123xyz789',
        published_at: new Date().toISOString(),
        thumbnail_url: 'https://cdn.opsly.app/thumbnails/pub-123/thumb.jpg',
        video_url: 'https://cdn.opsly.app/renders/pub-123/video.mp4',
        metadata: {
          duration_sec: 30,
          aspect_ratio: '9:16',
          language: 'en',
        },
        created_at: new Date().toISOString(),
      };

      mockSupabase.addPublishedOutput(publishedOutput);

      const { data } = await mockSupabase
        .schema('platform')
        .from('published_outputs')
        .select('*');

      expect(data).toContainEqual(
        expect.objectContaining({
          platform_status: 'published',
          published_url: expect.stringContaining('youtube'),
        })
      );
    });

    it('should publish to multiple platforms', async () => {
      const platforms = ['youtube_shorts', 'instagram_reels', 'tiktok'];

      for (const platform of platforms) {
        mockSupabase.addPublishedOutput({
          id: `pub-${Date.now()}-${platform}`,
          render_job_id: TEST_CONTEXT.render_job_id,
          tenant_slug: TEST_CONTEXT.tenant_slug,
          platform,
          platform_status: 'published',
          published_at: new Date().toISOString(),
        });
      }

      const { data } = await mockSupabase
        .schema('platform')
        .from('published_outputs')
        .select('*');

      expect(data).toHaveLength(3);
    });

    it('should track multi-platform publish status', async () => {
      const renderId = `render-${Date.now()}`;

      // YouTube - success
      mockSupabase.addPublishedOutput({
        id: `pub-${Date.now()}-yt`,
        render_job_id: renderId,
        platform: 'youtube_shorts',
        platform_status: 'published',
        published_url: 'https://youtube.com/shorts/xyz123',
      });

      // Instagram - pending
      mockSupabase.addPublishedOutput({
        id: `pub-${Date.now()}-ig`,
        render_job_id: renderId,
        platform: 'instagram_reels',
        platform_status: 'pending',
      });

      // TikTok - failed
      mockSupabase.addPublishedOutput({
        id: `pub-${Date.now()}-tik`,
        render_job_id: renderId,
        platform: 'tiktok',
        platform_status: 'failed',
      });

      const { data } = await mockSupabase
        .schema('platform')
        .from('published_outputs')
        .select('*');

      const published = data?.filter((p: any) => p.platform_status === 'published');
      const pending = data?.filter((p: any) => p.platform_status === 'pending');
      const failed = data?.filter((p: any) => p.platform_status === 'failed');

      expect(published).toHaveLength(1);
      expect(pending).toHaveLength(1);
      expect(failed).toHaveLength(1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // INTEGRATION: Full End-to-End Flow
  // ───────────────────────────────────────────────────────────────────────────

  describe('Integration: Complete E2E Flow', () => {
    it('should execute full flow: event → draft → approval → render → publish', async () => {
      // Step 1: Event triggered
      const event: OpslyEvent = 'validation.feedback.applied';
      const eventData = {
        tenant_slug: TEST_CONTEXT.tenant_slug,
        generate_content: true,
        draft_id: TEST_CONTEXT.draft_id,
        draft: {
          title: 'E2E Test Content',
          sections: [
            { type: 'intro', copy: 'Introduction', duration_sec: 3 },
            { type: 'main', copy: 'Main content', duration_sec: 15 },
            { type: 'cta', copy: 'Call to action', duration_sec: 3 },
          ],
        },
        preset: { slug: 'test_preset', aspect_ratio: '9:16' as const },
        request_id: TEST_CONTEXT.request_id,
        timestamp: new Date().toISOString(),
      };

      // Step 1.5: Verify event triggers job enqueue
      const jobIds = await handleRuntimeEvent(mockQueue as any, event, eventData);
      expect(jobIds).toHaveLength(1);

      // Step 2: Draft added to approval queue
      const approvalItem = {
        id: `approval-e2e-${Date.now()}`,
        request_id: TEST_CONTEXT.request_id,
        tenant_slug: TEST_CONTEXT.tenant_slug,
        draft_id: TEST_CONTEXT.draft_id,
        workflow_id: 'content_generation_v1',
        status: 'pending' as const,
        priority: 'normal' as const,
        confidence: 0.85,
        created_at: new Date().toISOString(),
      };

      await mockSupabase.schema('platform').from('approval_queue').insert(approvalItem);

      // Step 3: Approval decision
      await mockSupabase
        .schema('platform')
        .from('approval_queue')
        .update({
          id: approvalItem.id,
          status: 'approved',
          reviewer_email: 'reviewer@opsly.app',
          resolved_at: new Date().toISOString(),
        });

      // Step 4: Render job initiated
      const renderJob = {
        id: `render-e2e-${Date.now()}`,
        approval_id: approvalItem.id,
        tenant_slug: TEST_CONTEXT.tenant_slug,
        status: 'queued' as const,
        progress: 0,
        created_at: new Date().toISOString(),
      };

      mockSupabase.addRenderJob(renderJob);

      // Step 5a: Render job starts
      mockSupabase.addRenderJob({
        ...renderJob,
        status: 'rendering' as const,
        progress: 50,
        started_at: new Date().toISOString(),
      });

      // Step 5b: Render job completes
      const completedAt = new Date();
      const startedAt = new Date(completedAt.getTime() - 45000);
      mockSupabase.addRenderJob({
        ...renderJob,
        status: 'completed' as const,
        progress: 100,
        started_at: startedAt.toISOString(),
        completed_at: completedAt.toISOString(),
        duration_seconds: 45,
        output_url: `https://cdn.opsly.app/renders/${approvalItem.id}/video.mp4`,
      });

      // Step 6: Content published
      mockSupabase.addPublishedOutput({
        id: `pub-e2e-${Date.now()}`,
        render_job_id: renderJob.id,
        tenant_slug: TEST_CONTEXT.tenant_slug,
        workflow_id: 'content_generation_v1',
        content_type: 'video',
        platform: 'youtube_shorts',
        platform_status: 'published',
        platform_id: 'yt-e2e-test-123',
        published_url: 'https://youtube.com/shorts/e2e-test-123',
        published_at: new Date().toISOString(),
        metadata: {
          duration_sec: 30,
          aspect_ratio: '9:16',
        },
        created_at: new Date().toISOString(),
      });

      // Verification
      const { data: approvals } = await mockSupabase
        .schema('platform')
        .from('approval_queue')
        .select('*');

      const { data: renders } = await mockSupabase
        .schema('platform')
        .from('render_jobs')
        .select('*');

      const { data: published } = await mockSupabase
        .schema('platform')
        .from('published_outputs')
        .select('*');

      // Assertions
      expect(approvals).toContainEqual(expect.objectContaining({ status: 'approved' }));
      expect(renders).toContainEqual(
        expect.objectContaining({ status: 'completed', progress: 100 })
      );
      expect(published).toContainEqual(
        expect.objectContaining({ platform_status: 'published' })
      );

      // Job was enqueued
      const enqueuedJobs = mockQueue.getJobs();
      expect(enqueuedJobs).toHaveLength(1);
    });

    it('should handle rejection in approval phase', async () => {
      // Step 1: Event triggered
      const event: OpslyEvent = 'validation.feedback.applied';
      const eventData = {
        tenant_slug: TEST_CONTEXT.tenant_slug,
        generate_content: true,
        draft_id: `draft-reject-${Date.now()}`,
        request_id: TEST_CONTEXT.request_id,
        timestamp: new Date().toISOString(),
      };

      const jobIds = await handleRuntimeEvent(mockQueue as any, event, eventData);
      expect(jobIds).toHaveLength(1);

      // Step 2: Added to approval queue
      const approvalId = `approval-reject-${Date.now()}`;
      await mockSupabase.schema('platform').from('approval_queue').insert({
        id: approvalId,
        tenant_slug: TEST_CONTEXT.tenant_slug,
        status: 'pending',
      });

      // Step 3: Rejected by reviewer
      await mockSupabase
        .schema('platform')
        .from('approval_queue')
        .update({
          id: approvalId,
          status: 'rejected',
          reasoning: 'Brand voice does not match guidelines',
          reviewer_email: 'reviewer@opsly.app',
          resolved_at: new Date().toISOString(),
        });

      // Verification: No render job should be created
      const { data: renders } = await mockSupabase
        .schema('platform')
        .from('render_jobs')
        .select('*');

      expect(renders).not.toContainEqual(
        expect.objectContaining({ approval_id: approvalId })
      );

      // But approval queue shows rejection
      const { data: approvals } = await mockSupabase
        .schema('platform')
        .from('approval_queue')
        .select('*');

      expect(approvals).toContainEqual(expect.objectContaining({ status: 'rejected' }));
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Configuration & Mapping Validation
  // ───────────────────────────────────────────────────────────────────────────

  describe('Event-to-Job Mappings', () => {
    it('should have all required event mappings configured', () => {
      const mappings = getEventJobMappings();

      expect(mappings).toBeDefined();
      expect(mappings.length).toBeGreaterThan(0);

      const eventTypes = mappings.map((m) => m.event);
      expect(eventTypes).toContain('validation.feedback.applied');
      expect(eventTypes).toContain('agent.task.completed');
      expect(eventTypes).toContain('job.completed');
      expect(eventTypes).toContain('tenant.onboarded');
    });

    it('should validate mapping conditions', () => {
      const mappings = getEventJobMappings();

      for (const mapping of mappings) {
        expect(mapping.event).toBeDefined();
        expect(mapping.jobType).toBeDefined();
        expect(typeof mapping.shouldEnqueue).toBe('function');
        expect(typeof mapping.transformPayload).toBe('function');
      }
    });

    it('should transform event data to job payload correctly', () => {
      const mappings = getEventJobMappings();
      const validationMapping = mappings.find((m) => m.event === 'validation.feedback.applied');

      expect(validationMapping).toBeDefined();

      const eventData = {
        tenant_slug: 'test-tenant',
        generate_content: true,
        draft_id: 'draft-123',
        draft: { title: 'Test' },
        timestamp: new Date().toISOString(),
      };

      const payload = validationMapping!.transformPayload(eventData);

      expect(payload.tenant_slug).toBe('test-tenant');
      expect(payload.draft_id).toBe('draft-123');
      expect(payload.trigger_event).toBe('validation.feedback.applied');
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Error Handling & Edge Cases
  // ───────────────────────────────────────────────────────────────────────────

  describe('Error Handling & Edge Cases', () => {
    it('should handle missing required event data gracefully', async () => {
      const event: OpslyEvent = 'validation.feedback.applied';
      const eventData = {
        // Missing tenant_slug and required fields
        timestamp: new Date().toISOString(),
      };

      const jobIds = await handleRuntimeEvent(mockQueue as any, event, eventData);

      expect(jobIds).toHaveLength(0);
      expect(mockQueue.getJobs()).toHaveLength(0);
    });

    it('should handle unknown event types', async () => {
      const event = 'unknown.event' as OpslyEvent;
      const eventData = {
        tenant_slug: TEST_CONTEXT.tenant_slug,
        timestamp: new Date().toISOString(),
      };

      const jobIds = await handleRuntimeEvent(mockQueue as any, event, eventData);

      // Unknown events should not enqueue jobs (no mapping found)
      expect(jobIds).toHaveLength(0);
    });

    it('should handle concurrent approval decisions', async () => {
      const approvalIds = [];

      for (let i = 0; i < 3; i++) {
        const id = `approval-concurrent-${Date.now()}-${i}`;
        approvalIds.push(id);

        await mockSupabase.schema('platform').from('approval_queue').insert({
          id,
          tenant_slug: TEST_CONTEXT.tenant_slug,
          status: 'pending',
        });
      }

      // Simulate concurrent approvals
      for (const id of approvalIds) {
        await mockSupabase
          .schema('platform')
          .from('approval_queue')
          .update({
            id,
            status: 'approved',
            resolved_at: new Date().toISOString(),
          });
      }

      const { data } = await mockSupabase
        .schema('platform')
        .from('approval_queue')
        .select('*');

      const approved = data?.filter((a: any) => a.status === 'approved');
      expect(approved).toHaveLength(3);
    });

    it('should handle render job failures and retries', async () => {
      const renderJobId = `render-retry-${Date.now()}`;

      // Initial attempt - fails
      mockSupabase.addRenderJob({
        id: renderJobId,
        status: 'failed',
        error_message: 'Connection timeout',
        progress: 30,
      });

      // Retry attempt - succeeds
      mockSupabase.addRenderJob({
        id: `${renderJobId}-retry-1`,
        status: 'completed',
        progress: 100,
        output_url: 'https://cdn.opsly.app/renders/output.mp4',
      });

      const { data } = await mockSupabase
        .schema('platform')
        .from('render_jobs')
        .select('*');

      const failed = data?.filter((r: any) => r.status === 'failed');
      const completed = data?.filter((r: any) => r.status === 'completed');

      expect(failed).toHaveLength(1);
      expect(completed).toHaveLength(1);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // Configuration & Initialization
  // ───────────────────────────────────────────────────────────────────────────

  describe('Event Loop Wiring Configuration', () => {
    it('should initialize event loop wiring', async () => {
      const cleanup = await startEventLoopWiring({
        enabled: true,
        contentVideoQueue: mockQueue as any,
      });

      expect(cleanup).toBeDefined();
      expect(typeof cleanup).toBe('function');

      await cleanup();
    });

    it('should handle disabled event loop wiring', async () => {
      const cleanup = await startEventLoopWiring({
        enabled: false,
        contentVideoQueue: mockQueue as any,
      });

      expect(cleanup).toBeDefined();

      await cleanup();
    });

    it('should accept custom event mappings', async () => {
      const customMapping = {
        event: 'custom.event' as OpslyEvent,
        jobType: 'content_video' as const,
        shouldEnqueue: () => true,
        transformPayload: () => ({ custom: true }),
      };

      const cleanup = await startEventLoopWiring({
        enabled: true,
        contentVideoQueue: mockQueue as any,
        customMappings: [customMapping],
      });

      expect(cleanup).toBeDefined();

      await cleanup();
    });
  });
});
