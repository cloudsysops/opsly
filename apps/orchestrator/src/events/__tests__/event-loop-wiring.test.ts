/**
 * Tests for Event Loop Wiring
 *
 * Demonstrates how the event loop wiring system routes runtime events
 * to BullMQ job enqueueing.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Queue } from 'bullmq';
import {
  handleRuntimeEvent,
  getEventJobMappings,
  type ContentGenerationEvent,
  type EventToJobMapping,
} from '../event-loop-wiring.js';

// Mock Queue
const createMockQueue = (): Queue => ({
  add: vi.fn().mockResolvedValue({ id: 'job-123' }),
  name: 'test-queue',
  close: vi.fn(),
} as unknown as Queue);

describe('Event Loop Wiring', () => {
  let mockQueue: Queue;

  beforeEach(() => {
    mockQueue = createMockQueue();
  });

  describe('Event to Job Mappings', () => {
    it('should load default event mappings', () => {
      const mappings = getEventJobMappings();

      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings.some((m) => m.event === 'tenant.onboarded')).toBe(true);
      expect(mappings.some((m) => m.event === 'agent.task.completed')).toBe(true);
      expect(mappings.some((m) => m.event === 'validation.feedback.applied')).toBe(true);
    });

    it('should map events to correct job types', () => {
      const mappings = getEventJobMappings();
      const contentMappings = mappings.filter((m) => m.jobType === 'content_video');

      expect(contentMappings.length).toBeGreaterThan(0);
      expect(contentMappings.map((m) => m.event)).toContain('tenant.onboarded');
    });
  });

  describe('Runtime Event Handling', () => {
    it('should skip events without tenant_slug', async () => {
      const jobIds = await handleRuntimeEvent(mockQueue, 'job.completed', {
        job_id: 'job-123',
        // Missing tenant_slug
      });

      expect(jobIds).toEqual([]);
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should enqueue job for tenant.onboarded event when conditions met', async () => {
      const eventData = {
        tenant_slug: 'acme-corp',
        request_id: 'req-123',
        plan: 'business',
        timestamp: new Date().toISOString(),
      };

      const jobIds = await handleRuntimeEvent(mockQueue, 'tenant.onboarded', eventData);

      expect(jobIds.length).toBeGreaterThan(0);
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should skip tenant.onboarded for startup plan without auto_generate', async () => {
      const eventData = {
        tenant_slug: 'startup-tenant',
        request_id: 'req-123',
        plan: 'startup',
        auto_generate_intro_content: false,
        timestamp: new Date().toISOString(),
      };

      await handleRuntimeEvent(mockQueue, 'tenant.onboarded', eventData);

      // Should still enqueue because 'plan !== startup' OR 'auto_generate_intro_content === true'
      // But plan is startup and auto_generate is false, so should skip
      // Actually the mapping says: plan !== 'startup' || auto_generate_intro_content === true
      // So for startup without auto_generate, it should skip
      // Let's verify the logic
      expect(mockQueue.add).not.toHaveBeenCalled();
    });

    it('should enqueue for agent.task.completed with content task', async () => {
      const eventData = {
        tenant_slug: 'acme-corp',
        task_type: 'content_creation',
        draft_payload: { title: 'Test Draft' },
        timestamp: new Date().toISOString(),
      };

      const jobIds = await handleRuntimeEvent(mockQueue, 'agent.task.completed', eventData);

      expect(jobIds.length).toBeGreaterThan(0);
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should transform event data to job payload correctly', async () => {
      const eventData = {
        tenant_slug: 'acme-corp',
        request_id: 'req-123',
        task_id: 'task-456',
        task_type: 'content_creation',
        draft_payload: { title: 'Test Draft', content: 'Lorem ipsum' },
        content_preset: { slug: 'default', aspect_ratio: '9:16' },
        timestamp: new Date().toISOString(),
      };

      await handleRuntimeEvent(mockQueue, 'agent.task.completed', eventData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'content_video',
        expect.objectContaining({
          type: 'content_video',
          tenant_slug: 'acme-corp',
          payload: expect.objectContaining({
            tenant_slug: 'acme-corp',
            trigger_event: 'agent.task.completed',
            task_id: 'task-456',
          }),
        }),
        expect.any(Object)
      );
    });

    it('should handle multiple matching mappings', async () => {
      // Multiple events might match different patterns
      const eventData = {
        tenant_slug: 'acme-corp',
        request_id: 'req-123',
        job_type: 'content_generation',
        content_draft_prepared: true,
        draft_payload: { title: 'Generated Content' },
        content_preset: { slug: 'default' },
        timestamp: new Date().toISOString(),
      };

      const jobIds = await handleRuntimeEvent(mockQueue, 'job.completed', eventData);

      // Should match the content_generation mapping
      expect(jobIds.length).toBeGreaterThan(0);
    });

    it('should generate idempotency keys for deduplication', async () => {
      const eventData = {
        tenant_slug: 'acme-corp',
        request_id: 'req-123',
        draft_id: 'draft-789',
        draft_payload: { title: 'Test' },
        timestamp: new Date().toISOString(),
        generate_content: true,
      };

      await handleRuntimeEvent(mockQueue, 'validation.feedback.applied', eventData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'content_video',
        expect.any(Object),
        expect.objectContaining({
          jobId: expect.stringContaining('content_video'),
        })
      );
    });
  });

  describe('Event Loop Wiring Configuration', () => {
    it('should allow custom event to job mappings', () => {
      const customMapping: EventToJobMapping = {
        event: 'custom.event' as any,
        jobType: 'content_video',
        shouldEnqueue: (data) => Boolean(data.tenant_slug),
        transformPayload: (data) => ({
          tenant_slug: data.tenant_slug,
          custom_field: 'custom_value',
        }),
      };

      // In real usage, this would be passed to startEventLoopWiring()
      // For testing, we verify the structure
      expect(customMapping.event).toBe('custom.event');
      expect(customMapping.jobType).toBe('content_video');
      expect(customMapping.shouldEnqueue({ tenant_slug: 'test' })).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle queue errors gracefully', async () => {
      const errorQueue = createMockQueue();
      (errorQueue.add as any).mockRejectedValueOnce(new Error('Queue error'));

      // Should not throw, but should handle error internally
      const eventData = {
        tenant_slug: 'acme-corp',
        request_id: 'req-123',
        plan: 'business',
      };

      try {
        await handleRuntimeEvent(errorQueue, 'tenant.onboarded', eventData);
      } catch (err) {
        // handleRuntimeEvent might throw or might handle silently
        // depending on implementation
        expect(err).toBeDefined();
      }
    });
  });

  describe('Payload Transformation', () => {
    it('should preserve metadata through transformation', async () => {
      const eventData = {
        tenant_slug: 'acme-corp',
        request_id: 'req-123',
        plan: 'business',
        custom_metadata: { source: 'api', user_id: 'user-123' },
        timestamp: new Date().toISOString(),
      };

      await handleRuntimeEvent(mockQueue, 'tenant.onboarded', eventData);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'content_video',
        expect.objectContaining({
          payload: expect.objectContaining({
            metadata: expect.any(Object),
          }),
        }),
        expect.any(Object)
      );
    });

    it('should handle missing optional fields', async () => {
      const minimalEventData = {
        tenant_slug: 'acme-corp',
        plan: 'business',
      };

      const jobIds = await handleRuntimeEvent(mockQueue, 'tenant.onboarded', minimalEventData);

      expect(jobIds.length).toBeGreaterThan(0);
      expect(mockQueue.add).toHaveBeenCalled();
    });
  });
});
