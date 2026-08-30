"use client";

import { NoteItem } from "./items/NoteItem";
import { EmailItem } from "./items/EmailItem";
import { SentEmailItem } from "./items/SentEmailItem";
import { CallItem } from "./items/CallItem";
import { MeetingItem } from "./items/MeetingItem";
import { TaskItem } from "./items/TaskItem";
import { ActivityItem } from "./items/ActivityItem";

interface Activity {
  id: string;
  type: string;
  timestamp: string;
  data: unknown;
}

interface ActivityTimelineProps {
  activities: Activity[];
}

export function ActivityTimeline({ activities }: ActivityTimelineProps) {
  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

      {/* Timeline items */}
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="relative pl-10">
            {/* Timeline dot */}
            <div
              className={`absolute left-2.5 w-3 h-3 rounded-full border-2 border-white ${getActivityColor(
                activity.type
              )}`}
            />

            {/* Content */}
            {renderActivityItem(activity)}
          </div>
        ))}
      </div>
    </div>
  );
}

function getActivityColor(type: string): string {
  switch (type) {
    case "note":
      return "bg-brand-purple";
    case "email":
    case "sent-email":
      return "bg-brand-cyan";
    case "call":
      return "bg-brand-green";
    case "meeting":
      return "bg-brand-orange";
    case "task":
      return "bg-brand-yellow";
    default:
      return "bg-gray-400";
  }
}

function renderActivityItem(activity: Activity) {
  switch (activity.type) {
    case "note":
      return <NoteItem data={activity.data as NoteData} />;
    case "email":
      return <EmailItem data={activity.data as EmailData} />;
    case "sent-email":
      return <SentEmailItem data={activity.data as SentEmailData} />;
    case "call":
      return <CallItem data={activity.data as CallData} />;
    case "meeting":
      return <MeetingItem data={activity.data as MeetingData} />;
    case "task":
      return <TaskItem data={activity.data as TaskData} />;
    case "activity":
      return <ActivityItem data={activity.data as SystemActivityData} />;
    default:
      return (
        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
          Unknown activity type: {activity.type}
        </div>
      );
  }
}

// Type definitions for activity data
interface NoteData {
  id: string;
  content: string;
  authorEmail: string;
  isPinned: boolean;
  createdAt: string;
}

interface EmailData {
  id: string;
  direction: string;
  fromEmail: string;
  fromName: string | null;
  toEmails: string[];
  subject: string;
  bodyPreview: string;
  hasAttachments: boolean;
  sentAt: string;
}

interface SentEmailData {
  id: string;
  toEmail: string;
  subject: string;
  bodyHtml: string;
  bodyPreview: string;
  sentBy: string;
  sentAt: string;
  templateSlug: string | null;
  template?: {
    name: string;
    slug: string;
  } | null;
}

interface CallData {
  id: string;
  callType: string;
  direction: string;
  duration: number | null;
  outcome: string | null;
  notes: string | null;
  loggedBy: string;
  completedAt: string | null;
  createdAt: string;
}

interface MeetingData {
  id: string;
  title: string;
  description: string | null;
  meetingType: string;
  location: string | null;
  scheduledFor: string;
  duration: number;
  status: string;
  outcome: string | null;
  createdBy: string;
}

interface TaskData {
  id: string;
  title: string;
  description: string | null;
  dueDate: string | null;
  priority: string;
  status: string;
  assignedTo: string | null;
  completedAt: string | null;
  createdBy: string;
  createdAt: string;
}

interface SystemActivityData {
  id: string;
  activityType: string;
  description: string;
  performedBy: string | null;
  createdAt: string;
}
