import type { ContentEvent, ContentDraft } from '../types.js';
import { formatRelativeTime } from '../date-utils.js';

type StoryTemplate = {
  title: string;
  call_to_action: string;
  story_hook: (event: ContentEvent) => string;
};

const storyTemplates: Record<ContentEvent['event_type'], StoryTemplate> = {
  session_created: {
    title: 'New Session Started',
    call_to_action: 'Check it out →',
    story_hook: (event) =>
      `Started a new automation session ${formatRelativeTime(new Date(event.timestamp))}. Ready to ship features.`,
  },
  deployment_success: {
    title: 'Version Deployed',
    call_to_action: 'See what changed →',
    story_hook: (event) => {
      return `Deployed new version to production ${formatRelativeTime(new Date(event.timestamp))}. Changes live now.`;
    },
  },
  approval_completed: {
    title: 'Security Cleared',
    call_to_action: 'Review details →',
    story_hook: (event) => {
      return `Security review completed ${formatRelativeTime(new Date(event.timestamp))}. All checks passed ✓`;
    },
  },
  branch_merged: {
    title: 'Feature Shipped',
    call_to_action: 'What we shipped →',
    story_hook: (event) => {
      return `Merged feature branch ${formatRelativeTime(new Date(event.timestamp))}. New capability live.`;
    },
  },
  test_suite_passed: {
    title: 'Tests Passing',
    call_to_action: 'Confidence unlocked →',
    story_hook: (event) => {
      return `Full test suite passed ${formatRelativeTime(new Date(event.timestamp))}. Code quality validated.`;
    },
  },
  security_scan_clean: {
    title: 'Security Scan Clean',
    call_to_action: 'Zero vulns 🎉 →',
    story_hook: (event) => {
      return `Security scan completed ${formatRelativeTime(new Date(event.timestamp))}. Zero vulnerabilities detected.`;
    },
  },
  worker_online: {
    title: 'Worker Online',
    call_to_action: 'Distributed power →',
    story_hook: (event) => {
      return `Worker joined the team ${formatRelativeTime(new Date(event.timestamp))}. Distributed work active.`;
    },
  },
  session_resumed: {
    title: 'Session Recovered',
    call_to_action: 'Resilience in action →',
    story_hook: (event) => {
      return `Recovered from outage ${formatRelativeTime(new Date(event.timestamp))}. Work resumed seamlessly.`;
    },
  },
  migration_finished: {
    title: 'Infrastructure Upgraded',
    call_to_action: 'Modern stack →',
    story_hook: (event) => {
      return `Infrastructure migration completed ${formatRelativeTime(new Date(event.timestamp))}. System modernized.`;
    },
  },
};

export function mapEventToStory(event: ContentEvent): Partial<ContentDraft> {
  const template = storyTemplates[event.event_type];
  if (!template) {
    throw new Error(`Unknown event type: ${event.event_type}`);
  }

  const storyHook = template.story_hook(event);

  return {
    tenant_slug: event.tenant_slug,
    event_id: event.id,
    title: template.title,
    story_hook: storyHook,
    call_to_action: template.call_to_action,
    captions: [],
    image_prompt: '',
    compliance_flags: [],
    state: 'draft',
    copy_paste_kit: {
      instagram_caption: '',
      facebook_caption: '',
      linkedin_caption: '',
      x_caption: '',
      tiktok_script: '',
      youtube_shorts_script: '',
    },
    created_at: new Date().toISOString(),
  };
}

export function mapMultipleEventsToStory(events: ContentEvent[]): Partial<ContentDraft>[] {
  return events.map(mapEventToStory);
}
