import type { Job } from 'bullmq';

export type JobLookupQueue = {
  name: string;
  getJob: (jobId: string) => Promise<Job | undefined>;
};

/**
 * Resolve a BullMQ job id across one or more queues (openclaw, local-agents, …).
 * First hit wins.
 */
export async function findJobAcrossQueues(
  jobId: string,
  queues: JobLookupQueue[],
): Promise<{ job: Job; queue: string } | null> {
  for (const q of queues) {
    const job = await q.getJob(jobId);
    if (job) {
      return { job, queue: q.name };
    }
  }
  return null;
}
