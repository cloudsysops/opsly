import { formatDistanceToNow, format, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import type { ContentDraft } from '../types.js';

export interface DraftStatusInfo {
  state: ContentDraft['state'];
  label: string;
  icon: string;
  color: string;
}

export const statusConfig: Record<ContentDraft['state'], DraftStatusInfo> = {
  draft: {
    state: 'draft',
    label: 'Draft',
    icon: '📝',
    color: 'bg-gray-100 text-gray-800',
  },
  pending_approval: {
    state: 'pending_approval',
    label: 'Pending Approval',
    icon: '⏳',
    color: 'bg-yellow-100 text-yellow-800',
  },
  approved: {
    state: 'approved',
    label: 'Approved',
    icon: '✅',
    color: 'bg-green-100 text-green-800',
  },
  ready_to_copy: {
    state: 'ready_to_copy',
    label: 'Ready to Copy',
    icon: '📋',
    color: 'bg-blue-100 text-blue-800',
  },
  scheduled: {
    state: 'scheduled',
    label: 'Scheduled',
    icon: '📅',
    color: 'bg-purple-100 text-purple-800',
  },
  published: {
    state: 'published',
    label: 'Published',
    icon: '🚀',
    color: 'bg-emerald-100 text-emerald-800',
  },
};

export interface DraftListItemData {
  id: string;
  title: string;
  createdAgo: string;
  storyHook: string;
  platformCount: number;
  callToActionPreview: string;
  status: DraftStatusInfo;
}

export function getDraftListItemData(draft: Partial<ContentDraft>): DraftListItemData {
  return {
    id: draft.id || '',
    title: draft.title || 'Untitled',
    createdAgo: draft.created_at
      ? formatDistanceToNow(new Date(draft.created_at), { addSuffix: true })
      : 'Unknown',
    storyHook: draft.story_hook || '',
    platformCount: draft.captions?.length || 0,
    callToActionPreview: draft.call_to_action?.substring(0, 20) || '',
    status: statusConfig[draft.state || 'draft'],
  };
}

export interface CalendarDay {
  date: Date;
  dayNumber: number;
  isDayToday: boolean;
  isCurrentMonth: boolean;
  draftCount: number;
  drafts: Partial<ContentDraft>[];
}

export function getCalendarData(
  month: Date,
  drafts: Partial<ContentDraft>[]
): {
  monthLabel: string;
  weekDays: string[];
  days: CalendarDay[];
  scheduledDrafts: Partial<ContentDraft>[];
} {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const draftsByDate: Record<string, Partial<ContentDraft>[]> = {};
  drafts
    .filter((d) => d.state === 'scheduled')
    .forEach((draft) => {
      const dateKey = draft.created_at ? format(new Date(draft.created_at), 'yyyy-MM-dd') : '';
      if (dateKey) {
        if (!draftsByDate[dateKey]) {
          draftsByDate[dateKey] = [];
        }
        draftsByDate[dateKey].push(draft);
      }
    });

  const today = new Date();

  return {
    monthLabel: format(month, 'MMMM yyyy'),
    weekDays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    days: daysInMonth.map((day) => {
      const dateKey = format(day, 'yyyy-MM-dd');
      const dayDrafts = draftsByDate[dateKey] || [];

      return {
        date: day,
        dayNumber: parseInt(format(day, 'd')),
        isDayToday: format(day, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd'),
        isCurrentMonth: format(day, 'yyyy-MM') === format(month, 'yyyy-MM'),
        draftCount: dayDrafts.length,
        drafts: dayDrafts,
      };
    }),
    scheduledDrafts: drafts.filter((d) => d.state === 'scheduled'),
  };
}

export interface ApprovalQueueData {
  pendingApproval: Partial<ContentDraft>[];
  approved: Partial<ContentDraft>[];
  readyToCopy: Partial<ContentDraft>[];
}

export function getApprovalQueueData(drafts: Partial<ContentDraft>[]): ApprovalQueueData {
  return {
    pendingApproval: drafts.filter((d) => d.state === 'pending_approval'),
    approved: drafts.filter((d) => d.state === 'approved'),
    readyToCopy: drafts.filter((d) => d.state === 'ready_to_copy'),
  };
}

export interface ApprovalQueueItemData {
  id: string;
  title: string;
  storyHookPreview: string;
  createdAgo: string;
  platformCount: number;
}

export function getApprovalQueueItemData(draft: Partial<ContentDraft>): ApprovalQueueItemData {
  return {
    id: draft.id || '',
    title: draft.title || 'Untitled',
    storyHookPreview: draft.story_hook ? draft.story_hook.substring(0, 100) : '',
    createdAgo: draft.created_at
      ? formatDistanceToNow(new Date(draft.created_at), { addSuffix: true })
      : 'Unknown',
    platformCount: draft.captions?.length || 0,
  };
}

export interface DraftStats {
  totalDrafts: number;
  draftCount: number;
  pendingApprovalCount: number;
  approvedCount: number;
  readyToCopyCount: number;
  scheduledCount: number;
  publishedCount: number;
}

export function getDraftStats(drafts: Partial<ContentDraft>[]): DraftStats {
  return {
    totalDrafts: drafts.length,
    draftCount: drafts.filter((d) => d.state === 'draft').length,
    pendingApprovalCount: drafts.filter((d) => d.state === 'pending_approval').length,
    approvedCount: drafts.filter((d) => d.state === 'approved').length,
    readyToCopyCount: drafts.filter((d) => d.state === 'ready_to_copy').length,
    scheduledCount: drafts.filter((d) => d.state === 'scheduled').length,
    publishedCount: drafts.filter((d) => d.state === 'published').length,
  };
}
