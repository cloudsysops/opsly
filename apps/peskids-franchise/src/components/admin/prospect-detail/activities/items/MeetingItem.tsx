"use client";

import { formatDate } from "@/lib/utils";

interface MeetingItemProps {
  data: {
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
  };
}

const meetingTypeLabels: Record<string, string> = {
  DISCOVERY_CALL: "Discovery Call",
  INTERVIEW: "Interview",
  PRE_WORK_REVIEW: "Pre-Work Review",
  FOLLOW_UP: "Follow Up",
  OTHER: "Other",
};

const statusColors: Record<string, string> = {
  SCHEDULED: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-600",
  NO_SHOW: "bg-red-100 text-red-700",
};

const statusLabels: Record<string, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

export function MeetingItem({ data }: MeetingItemProps) {
  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-brand-orange"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm font-medium text-brand-navy">Meeting</span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
              statusColors[data.status] || "bg-gray-100 text-gray-600"
            }`}
          >
            {statusLabels[data.status] || data.status}
          </span>
        </div>
        <span className="text-xs text-gray-500">
          {formatDate(new Date(data.scheduledFor))}
        </span>
      </div>

      <div className="mb-2">
        <div className="text-sm font-medium text-gray-900">{data.title}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          {meetingTypeLabels[data.meetingType] || data.meetingType} • {data.duration} min
        </div>
        {data.location && (
          <div className="text-xs text-gray-500 mt-0.5">
            Location: {data.location}
          </div>
        )}
      </div>

      {data.description && (
        <p className="text-sm text-gray-600 mb-2">{data.description}</p>
      )}

      {data.outcome && (
        <div className="mt-2 p-2 bg-white rounded border border-gray-200">
          <div className="text-xs font-medium text-gray-500 mb-1">Outcome:</div>
          <p className="text-sm text-gray-700">{data.outcome}</p>
        </div>
      )}

      <div className="mt-2 text-xs text-gray-500">Created by {data.createdBy}</div>
    </div>
  );
}
