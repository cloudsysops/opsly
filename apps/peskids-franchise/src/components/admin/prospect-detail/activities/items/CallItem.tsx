"use client";

import { formatDate } from "@/lib/utils";

interface CallItemProps {
  data: {
    id: string;
    callType: string;
    direction: string;
    duration: number | null;
    outcome: string | null;
    notes: string | null;
    loggedBy: string;
    completedAt: string | null;
    createdAt: string;
  };
}

const outcomeLabels: Record<string, string> = {
  CONNECTED: "Connected",
  LEFT_VOICEMAIL: "Left Voicemail",
  NO_ANSWER: "No Answer",
  BUSY: "Busy",
  WRONG_NUMBER: "Wrong Number",
};

const outcomeColors: Record<string, string> = {
  CONNECTED: "bg-green-100 text-green-700",
  LEFT_VOICEMAIL: "bg-yellow-100 text-yellow-700",
  NO_ANSWER: "bg-gray-100 text-gray-600",
  BUSY: "bg-orange-100 text-orange-700",
  WRONG_NUMBER: "bg-red-100 text-red-700",
};

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) {
    return `${minutes}m`;
  }
  return `${minutes}m ${remainingSeconds}s`;
}

export function CallItem({ data }: CallItemProps) {
  const isInbound = data.direction === "INBOUND";
  const timestamp = data.completedAt || data.createdAt;

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-brand-green"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
          <span className="text-sm font-medium text-brand-navy">
            {data.callType === "VIDEO" ? "Video Call" : "Phone Call"}
          </span>
          <span
            className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
              isInbound
                ? "bg-blue-100 text-blue-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {isInbound ? "Inbound" : "Outbound"}
          </span>
          {data.outcome && (
            <span
              className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                outcomeColors[data.outcome] || "bg-gray-100 text-gray-600"
              }`}
            >
              {outcomeLabels[data.outcome] || data.outcome}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">{formatDate(new Date(timestamp))}</span>
      </div>

      {data.duration && (
        <div className="text-sm text-gray-600 mb-2">
          Duration: {formatDuration(data.duration)}
        </div>
      )}

      {data.notes && (
        <p className="text-sm text-gray-600 whitespace-pre-wrap">{data.notes}</p>
      )}

      <div className="mt-2 text-xs text-gray-500">Logged by {data.loggedBy}</div>
    </div>
  );
}
