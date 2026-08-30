"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

interface Activity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  prospect: {
    id: string;
    name: string;
    stage: string;
  };
}

interface RecentActivityFeedProps {
  activities: Activity[];
}

const activityTypeConfig: Record<
  string,
  { label: string; color: string; icon: string }
> = {
  FORM_SUBMITTED: { label: "Submitted form", color: "bg-brand-green", icon: "📝" },
  EMAIL_SENT: { label: "Email sent", color: "bg-brand-cyan", icon: "📧" },
  SMS_SENT: { label: "SMS sent", color: "bg-brand-purple", icon: "💬" },
  SMS_RECEIVED: { label: "SMS received", color: "bg-brand-purple", icon: "📱" },
  CALL_LOGGED: { label: "Call logged", color: "bg-brand-orange", icon: "📞" },
  STAGE_CHANGED: { label: "Stage changed", color: "bg-brand-navy", icon: "📊" },
  PRE_WORK_STARTED: { label: "Started pre-work", color: "bg-brand-yellow", icon: "🎯" },
  PRE_WORK_SUBMITTED: { label: "Submitted pre-work", color: "bg-brand-green", icon: "✅" },
  DOCUMENT_SIGNED: { label: "Signed document", color: "bg-brand-green", icon: "📄" },
  DOCUMENT_DOWNLOADED: { label: "Downloaded document", color: "bg-gray-400", icon: "⬇️" },
  NOTE_ADDED: { label: "Note added", color: "bg-gray-400", icon: "📝" },
  SCORE_UPDATED: { label: "Score updated", color: "bg-brand-orange", icon: "⭐" },
  LOGIN: { label: "Logged in", color: "bg-gray-400", icon: "🔐" },
  PAGE_VIEW: { label: "Viewed page", color: "bg-gray-300", icon: "👁️" },
  WORKFLOW_TRIGGERED: { label: "Workflow triggered", color: "bg-brand-purple", icon: "⚡" },
};

const stageLabels: Record<string, string> = {
  NEW_INQUIRY: "New Inquiry",
  INITIAL_CONTACT: "Initial Contact",
  DISCOVERY_CALL: "Discovery",
  PRE_WORK_IN_PROGRESS: "Pre-Work",
  PRE_WORK_COMPLETE: "Ready",
  INTERVIEW: "Interview",
  SELECTION_REVIEW: "Review",
  SELECTED: "Selected",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

export default function RecentActivityFeed({ activities }: RecentActivityFeedProps) {
  if (!activities || activities.length === 0) {
    return (
      <div className="py-6 text-center text-gray-400">
        <p className="text-sm">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {activities.map((activity) => {
        const config = activityTypeConfig[activity.type] || {
          label: activity.description,
          color: "bg-gray-400",
          icon: "📌",
        };

        return (
          <div key={activity.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
            <div
              className={`w-2 h-2 rounded-full ${config.color} flex-shrink-0`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <Link
                  href={`/admin/crm/prospects/${activity.prospect.id}`}
                  className="text-[13px] font-medium text-gray-900 hover:text-brand-purple truncate"
                >
                  {activity.prospect.name}
                </Link>
                <span className="text-[13px] text-gray-500 truncate">
                  {config.label.toLowerCase()}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                  activity.prospect.stage === "SELECTED"
                    ? "bg-green-50 text-green-700"
                    : activity.prospect.stage === "REJECTED" ||
                      activity.prospect.stage === "WITHDRAWN"
                    ? "bg-red-50 text-red-700"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {stageLabels[activity.prospect.stage] || activity.prospect.stage}
              </span>
              <span className="text-[11px] text-gray-400 whitespace-nowrap">
                {formatDistanceToNow(new Date(activity.timestamp), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
