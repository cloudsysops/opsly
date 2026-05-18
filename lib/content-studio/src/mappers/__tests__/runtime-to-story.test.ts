import { describe, it, expect } from 'vitest';
import { mapEventToStory, mapMultipleEventsToStory } from '../runtime-to-story.js';
import type { ContentEvent } from '../../types.js';

describe('RuntimeToStoryMapper', () => {
  const mockEvent: ContentEvent = {
    id: 'evt-001',
    tenant_slug: 'test-tenant',
    event_type: 'deployment_success',
    timestamp: new Date().toISOString(),
    context: { version: '1.2.3' },
    confidentiality: 'public',
  };

  it('should map deployment_success event to story draft', () => {
    const draft = mapEventToStory(mockEvent);

    expect(draft.tenant_slug).toBe('test-tenant');
    expect(draft.event_id).toBe('evt-001');
    expect(draft.title).toBe('Version Deployed');
    expect(draft.story_hook).toContain('Deployed new version');
    expect(draft.state).toBe('draft');
  });

  it('should format timestamp using date-fns', () => {
    const pastEvent: ContentEvent = {
      ...mockEvent,
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    };

    const draft = mapEventToStory(pastEvent);
    expect(draft.story_hook).toContain('minutes ago');
  });

  it('should map all 9 event types correctly', () => {
    const eventTypes: ContentEvent['event_type'][] = [
      'session_created',
      'deployment_success',
      'approval_completed',
      'branch_merged',
      'test_suite_passed',
      'security_scan_clean',
      'worker_online',
      'session_resumed',
      'migration_finished',
    ];

    eventTypes.forEach((eventType) => {
      const event: ContentEvent = {
        ...mockEvent,
        event_type: eventType,
      };

      const draft = mapEventToStory(event);
      expect(draft.story_hook).toBeTruthy();
      expect(draft.title).toBeTruthy();
      expect(draft.call_to_action).toBeTruthy();
    });
  });

  it('should map multiple events to story drafts', () => {
    const events: ContentEvent[] = [
      {
        ...mockEvent,
        id: 'evt-001',
        event_type: 'deployment_success',
      },
      {
        ...mockEvent,
        id: 'evt-002',
        event_type: 'security_scan_clean',
      },
    ];

    const drafts = mapMultipleEventsToStory(events);

    expect(drafts).toHaveLength(2);
    expect(drafts[0].event_id).toBe('evt-001');
    expect(drafts[1].event_id).toBe('evt-002');
  });

  it('should initialize empty captions and copy_paste_kit', () => {
    const draft = mapEventToStory(mockEvent);

    expect(draft.captions).toEqual([]);
    expect(draft.copy_paste_kit?.instagram_caption).toBe('');
    expect(draft.state).toBe('draft');
  });

  it('should throw error for unknown event type', () => {
    const invalidEvent: ContentEvent = {
      ...mockEvent,
      event_type: 'unknown_event' as any,
    };

    expect(() => mapEventToStory(invalidEvent)).toThrow('Unknown event type');
  });
});
