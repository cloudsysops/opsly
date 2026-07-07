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
  TwentyClient: vi.fn().mockImplementation(() => ({
    createTask: createTaskMock,
    updateTask: updateTaskMock,
    createTaskTarget: createTaskTargetMock,
  })),
}));

const { maybeSingleMock } = vi.hoisted(() => ({
  maybeSingleMock: vi.fn(),
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
  })),
}));

import {
  createTwentyTaskForLeadFollowup,
  syncTwentyTaskStatus,
} from '../twenty-followup-sync';

describe('twenty-followup-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTwentyTaskForLeadFollowup', () => {
    it('returns null when Twenty is not enabled for this tenant', async () => {
      resolveTwentyEnvMock.mockReturnValue({ enabled: false });

      const result = await createTwentyTaskForLeadFollowup({
        leadId: 'lead-1',
        type: 'call',
        dueDate: '2026-07-10',
        notes: null,
      });

      expect(result).toBeNull();
      expect(maybeSingleMock).not.toHaveBeenCalled();
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
        leadId: 'lead-1',
        type: 'call',
        dueDate: '2026-07-10',
        notes: null,
      });

      expect(result).toBeNull();
      expect(createTaskMock).not.toHaveBeenCalled();
    });

    it('creates a task and links it to the Twenty person', async () => {
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
    });

    it('swallows errors and returns null instead of throwing', async () => {
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
        leadId: 'lead-1',
        type: 'call',
        dueDate: '2026-07-10',
        notes: null,
      });

      expect(result).toBeNull();
    });
  });

  describe('syncTwentyTaskStatus', () => {
    it('does nothing when Twenty is not enabled', async () => {
      resolveTwentyEnvMock.mockReturnValue({ enabled: false });

      await syncTwentyTaskStatus('task-1', 'completed');

      expect(updateTaskMock).not.toHaveBeenCalled();
    });

    it('maps completed followup status to DONE', async () => {
      resolveTwentyEnvMock.mockReturnValue({
        enabled: true,
        apiKey: 'key',
        baseUrl: 'https://crm.example.com',
      });

      await syncTwentyTaskStatus('task-1', 'completed');

      expect(updateTaskMock).toHaveBeenCalledWith('task-1', { status: 'DONE' });
    });

    it('swallows errors instead of throwing', async () => {
      resolveTwentyEnvMock.mockReturnValue({
        enabled: true,
        apiKey: 'key',
        baseUrl: 'https://crm.example.com',
      });
      updateTaskMock.mockRejectedValue(new Error('Twenty is down'));

      await expect(syncTwentyTaskStatus('task-1', 'pending')).resolves.toBeUndefined();
    });
  });
});
