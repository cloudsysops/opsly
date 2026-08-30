"use client";

import { formatDate } from "@/lib/utils";

interface EmailItemProps {
  data: {
    id: string;
    direction: string;
    fromEmail: string;
    fromName: string | null;
    toEmails: string[];
    subject: string;
    bodyPreview: string;
    hasAttachments: boolean;
    sentAt: string;
  };
}

export function EmailItem({ data }: EmailItemProps) {
  const isInbound = data.direction === "INBOUND";

  return (
    <div className="p-4 bg-gray-50 rounded-lg">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-brand-cyan"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
          <span className="text-sm font-medium text-brand-navy">
            Email {isInbound ? "Received" : "Sent"}
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
          {data.hasAttachments && (
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13"
              />
            </svg>
          )}
        </div>
        <span className="text-xs text-gray-500">{formatDate(new Date(data.sentAt))}</span>
      </div>

      <div className="mb-2">
        <div className="text-sm font-medium text-gray-900">{data.subject}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          From: {data.fromName ? `${data.fromName} <${data.fromEmail}>` : data.fromEmail}
        </div>
        {data.toEmails.length > 0 && (
          <div className="text-xs text-gray-500">
            To: {data.toEmails.join(", ")}
          </div>
        )}
      </div>

      <p className="text-sm text-gray-600 line-clamp-3">{data.bodyPreview}</p>
    </div>
  );
}
