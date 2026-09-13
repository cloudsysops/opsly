import { describe, expect, it } from 'vitest';
import { summarizeHealthTravelReceipts } from '../health-travel-summary';

describe('summarizeHealthTravelReceipts', () => {
  it('separates business activity from connectivity and aggregates canonical events', () => {
    const summary = summarizeHealthTravelReceipts(
      [
        {
          event_type: 'health.lead.created',
          processing_status: 'applied',
          occurred_at: '2026-09-12T10:00:00.000Z',
        },
        {
          event_type: 'health.deposit.paid',
          processing_status: 'reconciliation_required',
          occurred_at: '2026-09-12T12:00:00.000Z',
        },
        {
          event_type: 'health.journey.completed',
          processing_status: 'applied',
          occurred_at: '2026-09-12T13:00:00.000Z',
        },
      ],
      new Date('2026-09-12T14:00:00.000Z')
    );

    expect(summary.activity).toMatchObject({
      status: 'recent',
      last_event_type: 'health.journey.completed',
      hours_since_last_event: 1,
    });
    expect(summary.counts).toMatchObject({
      leads: 1,
      deposits_paid: 1,
      journeys_completed: 1,
      reconciliation_required: 1,
    });
  });

  it('reports never_seen when there are no business events', () => {
    const summary = summarizeHealthTravelReceipts([], new Date());
    expect(summary.activity.status).toBe('never_seen');
    expect(summary.activity.last_event_at).toBeNull();
  });

  it('reports quiet without declaring the runtime unavailable', () => {
    const summary = summarizeHealthTravelReceipts(
      [
        {
          event_type: 'health.lead.created',
          processing_status: 'applied',
          occurred_at: '2026-09-10T00:00:00.000Z',
        },
      ],
      new Date('2026-09-12T12:00:00.000Z')
    );
    expect(summary.activity.status).toBe('quiet');
  });
});
