import { z } from 'zod';

import type { ToolDefinition, ToolResponse } from '../../types/index.js';
import type { ToolContext } from '../../types/tools.types.js';
import { getSkillQueue } from './skill-queue.client.js';

const executeSkillInputSchema = z.object({
  skillName: z.string().min(1),
  params: z.record(z.string(), z.unknown()).default({}),
  reasoning: z.string().min(1),
});

const getJobStatusInputSchema = z.object({
  jobId: z.string().min(1),
});

type ExecuteSkillInput = z.infer<typeof executeSkillInputSchema>;
type GetSkillJobStatusInput = z.infer<typeof getJobStatusInputSchema>;

type ExecuteSkillOutput = ToolResponse<{
  jobId: string;
  status: string;
}>;

type GetSkillJobStatusOutput = ToolResponse<{
  jobId: string;
  status: string;
}>;

const executeSkillTool: ToolDefinition<ExecuteSkillInput, ExecuteSkillOutput> = {
  name: 'execute_skill',
  description: 'Queue a heavyweight skill for asynchronous execution via BullMQ.',
  inputSchema: executeSkillInputSchema,
  handler: async (input, context?: ToolContext): Promise<ExecuteSkillOutput> => {
    try {
      if (input.skillName.trim().length === 0) {
        return { success: false, error: 'skillName cannot be empty' };
      }

      const queue = getSkillQueue();
      try {
        const job = await queue.add('run_skill', {
          ...input,
          context,
        });

        return {
          success: true,
          data: {
            jobId: String(job.id ?? ''),
            status: 'queued',
          },
        };
      } finally {
        await queue.close().catch(() => undefined);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  },
};

const getSkillJobStatusTool: ToolDefinition<GetSkillJobStatusInput, GetSkillJobStatusOutput> = {
  name: 'get_skill_job_status',
  description: 'Read BullMQ state for a job queued by execute_skill.',
  inputSchema: getJobStatusInputSchema,
  handler: async (input): Promise<GetSkillJobStatusOutput> => {
    try {
      const queue = getSkillQueue();
      try {
        const job = await queue.getJob(input.jobId);
        if (job === undefined) {
          return {
            success: false,
            error: `Job not found: ${input.jobId}`,
          };
        }
        const state = await job.getState();
        return {
          success: true,
          data: {
            jobId: input.jobId,
            status: state,
          },
        };
      } finally {
        await queue.close().catch(() => undefined);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return { success: false, error: message };
    }
  },
};

export const skillTools = [executeSkillTool, getSkillJobStatusTool];
