import { describe, expect, it, vi, beforeEach } from 'vitest';

const { resolveTwentyEnvMock, createTaskMock, updateTaskMock, createTaskTargetMock } = vi.hoisted(
  () => ({
    resolveTwentyEnvMock: vi.fn(),
    createTaskMock: vi.fn(),
    updateTaskMock: vi.fn(),
    createTaskTargetMock: vi.fn(),
  })
);

vi.mock('@intcloudsysops/services/twenty', () => ({
  resolveTwentyEnv: resolveTwentyEnvMock,
  TwentyClient: vi.fn(function TwentyClientMock() {
    return {
      createTask: createTaskMock,
      updateTask: updateTaskMock,
      createTaskTarget: createTaskTargetMock,
    };
  }),
}));

const { maybeSingleMock, followupUpdateMock, followupSelectMaybeSingleMock } = vi.hoisted(() => ({
  maybeSingleMock: vi.fn(),
  followupUpdateMock: vi.fn(),
  followupSelectMaybeSingleMock: vi.fn(),
}));

vi.mock('@/lib/supabase', () => ({
  supabaseServer: vi.fn(() => ({
    schema: vi.fn(() => ({
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: maybeSingleMock,
          })),
        })),
      })),
    })),
    from: vi.fn((table: string) => {
      if (table !== 'followups') {
        throw new Error(`unexpected table ${table}`);
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: followupSelectMaybeSingleMock,
          })),
        })),
        update: vi.fn((patch: unknown) => {
          followupUpdateMock(patch);
          return {
            eq: vi.fn(async () => ({ error: null })),
          };
        }),
      };
    }),
  })),
}));

import {
  createTwentyTaskForLeadFollowup,
  syncTwentyTaskStatus,
} from '../twenty-followup-sync';

describe('twenty-followup-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    followupSelectMaybeSingleMock.mockResolvedValue({
      data: { retry_count: 0 },
      error: null,
    });
  });

  describe('createTwentyTaskForLeadFollowup', () => {
    it('returns null when Twenty is not enabled for this tenant', async () => {
      resolveTwentyEnvMock.mockReturnValue({ enabled: false });

      const result = await createTwentyTaskForLeadFollowup({
        followupId: 'fu-1',
        leadId: 'lead-1',
        type: 'call',
        dueDate: '2026-07-10',
        notes: null,
      });

      expect(result).toBeNull();
      expect(maybeSingleMock).not.toHaveBeenCalled();
      expect(followupUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({ sync_status: 'skipped' })
      );
    });

    it('returns null when the lead has no Twenty ids', async () => {
      resolveTwentyEnvMock.mockReturnValue({
        enabled: true,
        apiKey: 'key',
        baseUrl: 'https://crm.example.com',
      });
      maybeSingleMock.mockResolvedValue({
        data: { twenty_person_id: null, twenty_opportunity_id: null },
        error: null,
      });

      const result = await createTwentyTaskForLeadFollowup({
        followupId: 'fu-1',
        leadId: 'lead-1',
        type: 'call',
        dueDate: '2026-07-10',
        notes: null,
      });

      expect(result).toBeNull();
      expect(createTaskMock).not.toHaveBeenCalled();
      expect(followupUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({ sync_status: 'skipped' })
      );
    });

    it('creates a task and marks followup synced', async () => {
      resolveTwentyEnvMock.mockReturnValue({
        enabled: true,
        apiKey: 'key',
        baseUrl: 'https://crm.example.com',
      });
      maybeSingleMock.mockResolvedValue({
        data: { twenty_person_id: 'person-1', twenty_opportunity_id: null },
        error: null,
      });
      createTaskMock.mockResolvedValue({ id: 'task-1' });
      createTaskTargetMock.mockResolvedValue({ id: 'target-1' });

      const result = await createTwentyTaskForLeadFollowup({
        followupId: 'fu-1',
        leadId: 'lead-1',
        type: 'call',
        dueDate: '2026-07-10',
        notes: 'Llamar a las 3pm',
      });

      expect(result).toBe('task-1');
      expect(createTaskMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'TODO', body: 'Llamar a las 3pm' })
      );
      expect(createTaskTargetMock).toHaveBeenCalledWith({
        taskId: 'task-1',
        personId: 'person-1',
      });
      expect(followupUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sync_status: 'synced',
          twenty_task_id: 'task-1',
          retry_count: 0,
        })
      );
    });

    it('swallows errors and marks failed instead of throwing', async () => {
      resolveTwentyEnvMock.mockReturnValue({
        enabled: true,
        apiKey: 'key',
        baseUrl: 'https://crm.example.com',
      });
      maybeSingleMock.mockResolvedValue({
        data: { twenty_person_id: 'person-1', twenty_opportunity_id: null },
        error: null,
      });
      createTaskMock.mockRejectedValue(new Error('Twenty is down'));

      const result = await createTwentyTaskForLeadFollowup({
        followupId: 'fu-1',
        leadId: 'lead-1',
        type: 'call',
        dueDate: '2026-07-10',
        notes: null,
      });

      expect(result).toBeNull();
      expect(followupUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sync_status: 'failed',
          sync_error: 'Twenty is down',
          retry_count: 1,
        })
      );
    });
  });

  describe('syncTwentyTaskStatus', () => {
    it('skips when Twenty is not enabled', async () => {
      resolveTwentyEnvMock.mockReturnValue({ enabled: false });

      await syncTwentyTaskStatus('fu-1', 'task-1', 'completed');

      expect(updateTaskMock).not.toHaveBeenCalled();
      expect(followupUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({ sync_status: 'skipped' })
      );
    });

    it('maps completed followup status to DONE and marks synced', async () => {
      resolveTwentyEnvMock.mockReturnValue({
        enabled: true,
        apiKey: 'key',
        baseUrl: 'https://crm.example.com',
      });

      await syncTwentyTaskStatus('fu-1', 'task-1', 'completed');

      expect(updateTaskMock).toHaveBeenCalledWith('task-1', { status: 'DONE' });
      expect(followupUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({ sync_status: 'synced', retry_count: 0 })
      );
    });

    it('swallows errors and marks failed instead of throwing', async () => {
      resolveTwentyEnvMock.mockReturnValue({
        enabled: true,
        apiKey: 'key',
        baseUrl: 'https://crm.example.com',
      });
      updateTaskMock.mockRejectedValue(new Error('Twenty is down'));

      await expect(syncTwentyTaskStatus('fu-1', 'task-1', 'pending')).resolves.toBeUndefined();
      expect(followupUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          sync_status: 'failed',
          sync_error: 'Twenty is down',
        })
      );
    });
  });
});
