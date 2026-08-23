"use client";

import { useState } from "react";
import { formatDate } from "@/lib/utils";

interface SentEmailItemProps {
  data: {
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
  };
}

export function SentEmailItem({ data }: SentEmailItemProps) {
  const [showFull, setShowFull] = useState(false);

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
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
          <span className="text-sm font-medium text-brand-navy">
            Email Sent
          </span>
          {data.template?.name && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-brand-cyan/10 text-brand-cyan">
              {data.template.name}
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">{formatDate(new Date(data.sentAt))}</span>
      </div>

      <div className="mb-2">
        <div className="text-sm font-medium text-gray-900">{data.subject}</div>
        <div className="text-xs text-gray-500 mt-0.5">
          To: {data.toEmail}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          Sent by: {data.sentBy}
        </div>
      </div>

      {showFull ? (
        <div className="mt-3 border rounded-lg overflow-hidden">
          <div className="p-2 bg-gray-100 border-b flex items-center justify-between">
            <span className="text-xs font-medium text-gray-600">Full Email</span>
            <button
              onClick={() => setShowFull(false)}
              className="text-xs text-brand-cyan hover:underline"
            >
              Collapse
            </button>
          </div>
          <iframe
            srcDoc={data.bodyHtml}
            className="w-full h-[400px] border-0 bg-white"
            sandbox="allow-same-origin"
            title="Full Email"
          />
        </div>
      ) : (
        <>
          <p className="text-sm text-gray-600 line-clamp-3">{data.bodyPreview}</p>
          <button
            onClick={() => setShowFull(true)}
            className="mt-2 text-xs text-brand-cyan hover:underline"
          >
            View Full Email
          </button>
        </>
      )}
    </div>
  );
}
