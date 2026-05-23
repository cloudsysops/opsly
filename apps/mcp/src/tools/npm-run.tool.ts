import { Queue, Worker } from 'bullmq';
import { z } from 'zod';
import { execSync } from 'child_process';

const NpmRunSchema = z.object({
  script: z.enum(['test', 'type-check', 'lint', 'build', 'dev', 'verify']).describe('npm script to run'),
  workspace: z.string().optional().describe('workspace name (e.g., @intcloudsysops/api)'),
  watch: z.boolean().default(false).describe('Enable watch mode for test/dev'),
  timeout: z.number().int().positive().default(30000).describe('Timeout in milliseconds'),
});

type NpmRunInput = z.infer<typeof NpmRunSchema>;

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
};

let queue: Queue | null = null;

function getQueue(): Queue {
  if (!queue) {
    queue = new Queue('npm-tasks', { connection: redisConfig });
  }
  return queue;
}

export async function npmRunTool(input: NpmRunInput): Promise<{
  jobId: string;
  script: string;
  workspace?: string;
  status: 'queued' | 'error';
  pollUrl?: string;
  error?: string;
}> {
  const { script, workspace, watch, timeout } = NpmRunSchema.parse(input);

  try {
    const q = getQueue();
    const jobName = `${script}${workspace ? `:${workspace}` : ''}`;
    const cmd = workspace ? `npm run ${script} --workspace=${workspace}${watch ? ' --watch' : ''}` : `npm run ${script}${watch ? ' --watch' : ''}`;

    const job = await q.add('npm-script', { script, workspace, watch, timeout, cmd }, { jobId: `npm-${Date.now()}`, attempts: 1, removeOnComplete: false });

    return {
      jobId: job.id || '',
      script,
      workspace,
      status: 'queued',
      pollUrl: `/api/mcp/jobs/${job.id}`,
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return {
      jobId: '',
      script,
      workspace,
      status: 'error',
      error: errMsg,
    };
  }
}

export async function getJobStatus(jobId: string): Promise<{
  jobId: string;
  status: 'pending' | 'active' | 'completed' | 'failed';
  progress?: number;
  result?: string;
  error?: string;
}> {
  try {
    const q = getQueue();
    const job = await q.getJob(jobId);
    if (!job) {
      return { jobId, status: 'failed', error: 'Job not found' };
    }

    const state = await job.getState();
    const progress = job.progress;

    if (state === 'completed') {
      return {
        jobId,
        status: 'completed',
        progress: 100,
        result: job.returnvalue as string,
      };
    }

    if (state === 'failed') {
      return {
        jobId,
        status: 'failed',
        error: job.failedReason,
      };
    }

    return {
      jobId,
      status: (state as 'pending' | 'active' | 'completed' | 'failed'),
      progress: typeof progress === 'number' ? progress : 0,
    };
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error);
    return { jobId, status: 'failed', error: errMsg };
  }
}
