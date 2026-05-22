import { describe, it, expect } from 'vitest';
import {
  getDraftListItemData,
  getCalendarData,
  getApprovalQueueData,
  getApprovalQueueItemData,
  getDraftStats,
  statusConfig,
} from '../draft-view-data.js';
import type { ContentDraft } from '../../types.js';

describe('Draft View Data Utilities', () => {
  const mockDraft: Partial<ContentDraft> = {
    id: 'draft-001',
    title: 'New Feature Launch',
    story_hook: 'We just launched an amazing new feature',
    call_to_action: 'Check it out →',
    created_at: '2024-12-20T10:00:00Z',
    state: 'pending_approval',
    captions: [
      {
        platform: 'instagram',
        text: 'Check out our new feature! #shipping',
        hashtags: ['#shipping'],
        characterCount: 47,
      },
      {
        platform: 'x',
        text: 'Ship it! 🚀',
        hashtags: [],
        characterCount: 10,
      },
    ],
  };

  describe('statusConfig', () => {
    it('should have config for all states', () => {
      const states: ContentDraft['state'][] = [
        'draft',
        'pending_approval',
        'approved',
        'ready_to_copy',
        'scheduled',
        'published',
      ];

      states.forEach((state) => {
        expect(statusConfig[state]).toBeDefined();
        expect(statusConfig[state].label).toBeTruthy();
        expect(statusConfig[state].icon).toBeTruthy();
        expect(statusConfig[state].color).toBeTruthy();
      });
    });

    it('should have correct icons', () => {
      expect(statusConfig.draft.icon).toBe('📝');
      expect(statusConfig.pending_approval.icon).toBe('⏳');
      expect(statusConfig.approved.icon).toBe('✅');
      expect(statusConfig.ready_to_copy.icon).toBe('📋');
      expect(statusConfig.scheduled.icon).toBe('📅');
      expect(statusConfig.published.icon).toBe('🚀');
    });
  });

  describe('getDraftListItemData', () => {
    it('should extract list item data from draft', () => {
      const data = getDraftListItemData(mockDraft);

      expect(data.id).toBe('draft-001');
      expect(data.title).toBe('New Feature Launch');
      expect(data.platformCount).toBe(2);
      expect(data.status.state).toBe('pending_approval');
    });

    it('should handle missing title', () => {
      const draftNoTitle: Partial<ContentDraft> = {
        ...mockDraft,
        title: undefined,
      };

      const data = getDraftListItemData(draftNoTitle);
      expect(data.title).toBe('Untitled');
    });

    it('should format story hook preview', () => {
      const data = getDraftListItemData(mockDraft);
      expect(data.storyHook).toBe('We just launched an amazing new feature');
    });

    it('should count captions as platforms', () => {
      const data = getDraftListItemData(mockDraft);
      expect(data.platformCount).toBe(2);
    });
  });

  describe('getCalendarData', () => {
    it('should generate calendar data for month', () => {
      const now = new Date();
      const data = getCalendarData(now, [mockDraft]);

      expect(data.monthLabel).toBeTruthy();
      expect(data.weekDays).toHaveLength(7);
      expect(data.days.length).toBeGreaterThan(0);
    });

    it('should mark today correctly', () => {
      const now = new Date();
      const data = getCalendarData(now, []);

      const todayDay = data.days.find((d) => d.isDayToday);
      expect(todayDay).toBeDefined();
    });

    it('should group scheduled drafts by date', () => {
      const scheduled: Partial<ContentDraft> = {
        ...mockDraft,
        state: 'scheduled',
      };

      const data = getCalendarData(new Date(), [scheduled]);
      expect(data.scheduledDrafts).toHaveLength(1);
    });

    it('should only include scheduled drafts in calendar', () => {
      const drafts: Partial<ContentDraft>[] = [
        { ...mockDraft, state: 'draft' },
        { ...mockDraft, id: 'draft-002', state: 'scheduled' },
      ];

      const data = getCalendarData(new Date(), drafts);
      expect(data.scheduledDrafts).toHaveLength(1);
    });
  });

  describe('getApprovalQueueData', () => {
    it('should separate drafts by approval state', () => {
      const drafts: Partial<ContentDraft>[] = [
        { ...mockDraft, state: 'pending_approval' },
        { ...mockDraft, id: 'draft-002', state: 'approved' },
        { ...mockDraft, id: 'draft-003', state: 'ready_to_copy' },
      ];

      const data = getApprovalQueueData(drafts);

      expect(data.pendingApproval).toHaveLength(1);
      expect(data.approved).toHaveLength(1);
      expect(data.readyToCopy).toHaveLength(1);
    });

    it('should handle empty queues', () => {
      const data = getApprovalQueueData([]);

      expect(data.pendingApproval).toHaveLength(0);
      expect(data.approved).toHaveLength(0);
      expect(data.readyToCopy).toHaveLength(0);
    });
  });

  describe('getApprovalQueueItemData', () => {
    it('should extract item data for approval queue', () => {
      const data = getApprovalQueueItemData(mockDraft);

      expect(data.id).toBe('draft-001');
      expect(data.title).toBe('New Feature Launch');
      expect(data.platformCount).toBe(2);
    });

    it('should truncate story hook', () => {
      const longDraft: Partial<ContentDraft> = {
        ...mockDraft,
        story_hook:
          'This is a very long story hook that goes on and on and on and on and on and on and on and on and on and on and should be truncated at 100 characters',
      };

      const data = getApprovalQueueItemData(longDraft);
      expect(data.storyHookPreview.length).toBeLessThanOrEqual(100);
    });
  });

  describe('getDraftStats', () => {
    it('should count all draft states', () => {
      const drafts: Partial<ContentDraft>[] = [
        { ...mockDraft, state: 'draft' },
        { ...mockDraft, id: 'draft-002', state: 'pending_approval' },
        { ...mockDraft, id: 'draft-003', state: 'approved' },
        { ...mockDraft, id: 'draft-004', state: 'ready_to_copy' },
        { ...mockDraft, id: 'draft-005', state: 'scheduled' },
        { ...mockDraft, id: 'draft-006', state: 'published' },
      ];

      const stats = getDraftStats(drafts);

      expect(stats.totalDrafts).toBe(6);
      expect(stats.draftCount).toBe(1);
      expect(stats.pendingApprovalCount).toBe(1);
      expect(stats.approvedCount).toBe(1);
      expect(stats.readyToCopyCount).toBe(1);
      expect(stats.scheduledCount).toBe(1);
      expect(stats.publishedCount).toBe(1);
    });

    it('should sum to total', () => {
      const drafts: Partial<ContentDraft>[] = [
        { ...mockDraft, state: 'draft' },
        { ...mockDraft, id: 'draft-002', state: 'approved' },
      ];

      const stats = getDraftStats(drafts);
      const sum =
        stats.draftCount +
        stats.pendingApprovalCount +
        stats.approvedCount +
        stats.readyToCopyCount +
        stats.scheduledCount +
        stats.publishedCount;

      expect(sum).toBe(stats.totalDrafts);
    });

    it('should handle empty draft list', () => {
      const stats = getDraftStats([]);

      expect(stats.totalDrafts).toBe(0);
      expect(stats.draftCount).toBe(0);
      expect(stats.pendingApprovalCount).toBe(0);
    });
  });
});
