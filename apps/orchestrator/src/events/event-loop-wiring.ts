/**
 * Orchestrator Event Loop Wiring
 *
 * Listens to runtime events from the Opsly Event Bus and enqueues BullMQ jobs
 * for content generation based on configured event→job mappings.
 *
 * Events flow:
 * 1. Runtime events published via Redis Pub/Sub (opsly:events channel)
 * 2. Event loop wiring subscribes and routes events to job enqueuing
 * 3. Jobs enqueued to appropriate BullMQ queue based on event type
 * 4. Workers process jobs from their respective queues
 */

import { randomUUID } from 'node:crypto';
import { Queue } from 'bullmq';
import type { OpslyEvent } from './types.js';
import type { OrchestratorJob, JobType } from '../types.js';
import { logJobEnqueue } from '../observability/job-log.js';
import { buildQueueAddOptions } from '../queue-opts.js';
import { publishEvent } from './bus.js';

export interface ContentGenerationEvent extends OrchestratorJob {
  type: Extract<JobType, 'content_video' | 'content_image' | 'content_caption'>;
  payload: Record<string, unknown>;
  tenant_slug: string;
  request_id?: string;
  idempotency_key?: string;
  initiated_by: 'system' | 'claude' | 'discord' | 'cron';
}

export interface EventToJobMapping {
  event: OpslyEvent;
  jobType: JobType;
  shouldEnqueue: (eventData: Record<string, unknown>) => boolean;
  transformPayload: (eventData: Record<string, unknown>) => Record<string, unknown>;
}

/**
 * Maps runtime events to BullMQ jobs.
 * Add new mappings to automatically enqueue jobs on specific events.
 */
const eventJobMappings: EventToJobMapping[] = [
  // Content video generation triggered on deployment success or tenant achievement
  {
    event: 'validation.feedback.applied',
    jobType: 'content_video',
    shouldEnqueue: (data) => {
      // Enqueue content video if content generation is configured
      return Boolean(data.tenant_slug && data.generate_content === true);
    },
    transformPayload: (data) => ({
      tenant_slug: data.tenant_slug as string,
      trigger_event: 'validation.feedback.applied',
      request_id: data.request_id as string | undefined,
      draft_id: data.draft_id as string | undefined,
      draft: data.draft,
      preset: data.preset,
      metadata: {
        source_event: 'validation.feedback.applied',
        event_timestamp: data.timestamp as string | undefined,
      },
    }),
  },

  // Agent task completion → potentially generate success content
  {
    event: 'agent.task.completed',
    jobType: 'content_video',
    shouldEnqueue: (data) => {
      const isContentRelated = (data.task_type as string)?.includes('content');
      const shouldGenerate = data.auto_generate_content === true;
      return Boolean(data.tenant_slug && (isContentRelated || shouldGenerate));
    },
    transformPayload: (data) => ({
      tenant_slug: data.tenant_slug as string,
      trigger_event: 'agent.task.completed',
      request_id: data.request_id as string | undefined,
      task_id: data.task_id as string | undefined,
      draft: data.draft_payload,
      preset: data.preset || data.content_preset,
      metadata: {
        source_event: 'agent.task.completed',
        task_type: data.task_type,
        event_timestamp: data.timestamp as string | undefined,
      },
    }),
  },

  // Job completion → trigger content generation if configured
  {
    event: 'job.completed',
    jobType: 'content_video',
    shouldEnqueue: (data) => {
      return Boolean(
        data.tenant_slug &&
          data.job_type === 'content_generation' &&
          data.content_draft_prepared === true
      );
    },
    transformPayload: (data) => ({
      tenant_slug: data.tenant_slug as string,
      trigger_event: 'job.completed',
      request_id: data.request_id as string | undefined,
      draft_id: data.draft_id as string | undefined,
      draft: data.draft_payload,
      preset: data.content_preset,
      metadata: {
        source_event: 'job.completed',
        source_job_type: data.job_type,
        duration_ms: data.duration_ms as number | undefined,
        event_timestamp: data.timestamp as string | undefined,
      },
    }),
  },

  // Tenant onboarding → generate welcome/intro content
  {
    event: 'tenant.onboarded',
    jobType: 'content_video',
    shouldEnqueue: (data) => {
      return Boolean(
        data.tenant_slug &&
          (data.auto_generate_intro_content === true || data.plan !== 'startup')
      );
    },
    transformPayload: (data) => ({
      tenant_slug: data.tenant_slug as string,
      trigger_event: 'tenant.onboarded',
      request_id: data.request_id as string | undefined,
      draft_id: `intro_${data.tenant_slug}_${Date.now()}`,
      draft: {
        title: `${data.tenant_slug} Intro`,
        content_type: 'intro',
        tenant_slug: data.tenant_slug,
      },
      preset: data.content_preset || { slug: 'default_intro', aspect_ratio: '9:16' },
      metadata: {
        source_event: 'tenant.onboarded',
        plan: data.plan,
        event_timestamp: data.timestamp as string | undefined,
      },
    }),
  },
];

/**
 * Find matching job mappings for an event.
 */
function findJobMappingsForEvent(event: OpslyEvent): EventToJobMapping[] {
  return eventJobMappings.filter((mapping) => mapping.event === event);
}

/**
 * Enqueue a content generation job to the appropriate BullMQ queue.
 */
export async function enqueueContentGenerationJob(
  queue: Queue,
  job: ContentGenerationEvent
): Promise<string> {
  const idempotencyKey =
    job.idempotency_key ||
    `${job.type}:${job.tenant_slug}:${job.payload.draft_id || job.payload.task_id || randomUUID()}`;

  const opts = buildQueueAddOptions({
    ...job,
    idempotency_key: idempotencyKey,
  });

  const bullJob = await queue.add(job.type, job, opts);

  logJobEnqueue({
    event: 'job_enqueue',
    job_type: job.type,
    tenant_slug: job.tenant_slug,
    tenant_id: job.tenant_id,
    request_id: job.request_id,
    idempotency_key: idempotencyKey,
    initiated_by: job.initiated_by,
    metadata: {
      event_loop_triggered: true,
      trigger_event: job.payload.trigger_event,
      ...job.metadata,
    },
  });

  // Publish job enqueued event
  await publishEvent('job.enqueued', {
    job_id: bullJob.id,
    job_type: job.type,
    tenant_slug: job.tenant_slug,
    queue_name: queue.name,
    idempotency_key: idempotencyKey,
  });

  return String(bullJob.id);
}

/**
 * Process a single event and enqueue matching jobs.
 */
export async function handleRuntimeEvent(
  queue: Queue,
  event: OpslyEvent,
  eventData: Record<string, unknown>
): Promise<string[]> {
  const enqueuedJobIds: string[] = [];
  const mappings = findJobMappingsForEvent(event);

  for (const mapping of mappings) {
    try {
      // Check if this event should trigger a job
      if (!mapping.shouldEnqueue(eventData)) {
        continue;
      }

      const tenantSlug = eventData.tenant_slug as string | undefined;
      if (!tenantSlug) {
        console.warn('[event-loop-wiring] Event missing tenant_slug, skipping', {
          event,
          eventData,
        });
        continue;
      }

      // Transform event data to job payload
      const payload = mapping.transformPayload(eventData);

      // Create content generation job
      const job: ContentGenerationEvent = {
        type: mapping.jobType as Extract<JobType, 'content_video'>,
        payload,
        tenant_slug: tenantSlug,
        tenant_id: eventData.tenant_id as string | undefined,
        request_id: eventData.request_id as string | undefined,
        idempotency_key: eventData.idempotency_key as string | undefined,
        initiated_by: 'system',
        agent_role: 'builder',
        metadata: {
          source_event: event,
          event_timestamp: new Date().toISOString(),
        },
      };

      // Enqueue the job
      const jobId = await enqueueContentGenerationJob(queue, job);
      enqueuedJobIds.push(jobId);

      console.log('[event-loop-wiring] Job enqueued', {
        event,
        jobType: mapping.jobType,
        jobId,
        tenantSlug,
      });
    } catch (err) {
      console.error('[event-loop-wiring] Failed to enqueue job for event', {
        event,
        mapping: mapping.jobType,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return enqueuedJobIds;
}

/**
 * Configuration for event loop wiring.
 */
export interface EventLoopWiringConfig {
  /** Enable/disable event loop wiring */
  enabled: boolean;
  /** BullMQ queue for content video jobs */
  contentVideoQueue: Queue;
  /** Custom event-to-job mappings (extends defaults) */
  customMappings?: EventToJobMapping[];
  /** Enable verbose logging */
  verbose?: boolean;
}

/**
 * Start the orchestrator event loop wiring.
 *
 * Returns a cleanup function for graceful shutdown.
 */
export async function startEventLoopWiring(
  config: EventLoopWiringConfig
): Promise<() => Promise<void>> {
  if (!config.enabled) {
    return async () => {};
  }

  // Add custom mappings if provided
  if (config.customMappings) {
    eventJobMappings.push(...config.customMappings);
  }

  // Note: The actual event subscription happens in the main index.ts
  // This module provides the job enqueueing logic
  // Event subscription is coordinated at the orchestrator level

  console.log('[event-loop-wiring] Event loop wiring initialized', {
    mappings: eventJobMappings.length,
    contentVideoQueue: config.contentVideoQueue.name,
  });

  return async () => {
    console.log('[event-loop-wiring] Shutting down event loop wiring');
  };
}

/**
 * Get current event-to-job mappings for inspection/debugging.
 */
export function getEventJobMappings(): EventToJobMapping[] {
  return [...eventJobMappings];
}
