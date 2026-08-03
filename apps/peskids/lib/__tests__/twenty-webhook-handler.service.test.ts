import { beforeEach, describe, expect, it, vi } from 'vitest';

const leadsSelectMock = vi.fn();
const leadsUpdateMock = vi.fn();
const followupsSelectMock = vi.fn();
const followupsUpdateMock = vi.fn();

vi.mock('@/lib/supabase', () => ({
  supabaseServer: () => ({
    schema: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => leadsSelectMock(),
          }),
        }),
        update: (patch: unknown) => {
          leadsUpdateMock(patch);
          return { eq: async () => ({ error: null }) };
        },
      }),
    }),
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => followupsSelectMock(),
        }),
      }),
      update: (patch: unknown) => {
        followupsUpdateMock(patch);
        return { eq: async () => ({ error: null }) };
      },
    }),
  }),
}));

import { handleTwentyWebhookEvent } from '@/lib/twenty-webhook-handler.service';

describe('handleTwentyWebhookEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns unhandled for a payload with no recognizable event type', async () => {
    const result = await handleTwentyWebhookEvent({ foo: 'bar' });
    expect(result.handled).toBe(false);
  });

  it('returns unhandled for a payload with no record/data', async () => {
    const result = await handleTwentyWebhookEvent({ eventType: 'opportunity.updated' });
    expect(result.handled).toBe(false);
  });

  it('returns unhandled for an unrecognized event type', async () => {
    const result = await handleTwentyWebhookEvent({
      eventType: 'company.updated',
      record: { id: 'co-1' },
    });
    expect(result.handled).toBe(false);
    expect(result.detail).toContain('no handler');
  });

  describe('opportunity events', () => {
    it('syncs the lead status when the opportunity stage changed in Twenty', async () => {
      leadsSelectMock.mockResolvedValue({ data: { id: 'lead-1', status: 'new' }, error: null });

      const result = await handleTwentyWebhookEvent({
        eventType: 'opportunity.updated',
        record: { id: 'opp-1', stage: 'CONTACTED' },
      });

      expect(result.handled).toBe(true);
      expect(leadsUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'contacted' })
      );
    });

    it('collapses both trial stages to the admin "trial" status', async () => {
      leadsSelectMock.mockResolvedValue({ data: { id: 'lead-1', status: 'new' }, error: null });

      const result = await handleTwentyWebhookEvent({
        eventType: 'opportunity.updated',
        record: { id: 'opp-1', stage: 'TRIAL_COMPLETED' },
      });

      expect(result.handled).toBe(true);
      expect(leadsUpdateMock).toHaveBeenCalledWith(expect.objectContaining({ status: 'trial' }));
    });

    it('does not write when the status is already in sync', async () => {
      leadsSelectMock.mockResolvedValue({
        data: { id: 'lead-1', status: 'contacted' },
        error: null,
      });

      const result = await handleTwentyWebhookEvent({
        eventType: 'opportunity.updated',
        record: { id: 'opp-1', stage: 'CONTACTED' },
      });

      expect(result.handled).toBe(true);
      expect(leadsUpdateMock).not.toHaveBeenCalled();
    });

    it('is unhandled when no lead matches the opportunity id', async () => {
      leadsSelectMock.mockResolvedValue({ data: null, error: null });

      const result = await handleTwentyWebhookEvent({
        eventType: 'opportunity.updated',
        record: { id: 'opp-unknown', stage: 'CONTACTED' },
      });

      expect(result.handled).toBe(false);
      expect(leadsUpdateMock).not.toHaveBeenCalled();
    });

    it('is unhandled when the stage value is not recognizable', async () => {
      const result = await handleTwentyWebhookEvent({
        eventType: 'opportunity.updated',
        record: { id: 'opp-1', stage: 'SOME_CUSTOM_STAGE' },
      });

      expect(result.handled).toBe(false);
      expect(leadsSelectMock).not.toHaveBeenCalled();
    });
  });

  describe('task events', () => {
    it('marks the matching followup completed when a Twenty task is done', async () => {
      followupsSelectMock.mockResolvedValue({
        data: { id: 'followup-1', status: 'pending' },
        error: null,
      });

      const result = await handleTwentyWebhookEvent({
        eventType: 'task.updated',
        record: { id: 'task-1', status: 'DONE' },
      });

      expect(result.handled).toBe(true);
      expect(followupsUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'completed' })
      );
    });

    it('does nothing when the task status is not DONE', async () => {
      const result = await handleTwentyWebhookEvent({
        eventType: 'task.updated',
        record: { id: 'task-1', status: 'IN_PROGRESS' },
      });

      expect(result.handled).toBe(false);
      expect(followupsSelectMock).not.toHaveBeenCalled();
    });

    it('does not write when the followup is already completed', async () => {
      followupsSelectMock.mockResolvedValue({
        data: { id: 'followup-1', status: 'completed' },
        error: null,
      });

      const result = await handleTwentyWebhookEvent({
        eventType: 'task.updated',
        record: { id: 'task-1', status: 'DONE' },
      });

      expect(result.handled).toBe(true);
      expect(followupsUpdateMock).not.toHaveBeenCalled();
    });

    it('is unhandled when no followup matches the task id', async () => {
      followupsSelectMock.mockResolvedValue({ data: null, error: null });

      const result = await handleTwentyWebhookEvent({
        eventType: 'task.updated',
        record: { id: 'task-unknown', status: 'DONE' },
      });

      expect(result.handled).toBe(false);
    });
  });
});
