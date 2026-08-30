"use client";

import { formatDate } from "@/lib/utils";

interface NoteItemProps {
  data: {
    id: string;
    content: string;
    authorEmail: string;
    isPinned: boolean;
    createdAt: string;
  };
}

export function NoteItem({ data }: NoteItemProps) {
  return (
    <div
      className={`p-4 rounded-lg ${
        data.isPinned ? "bg-brand-light border border-brand-cyan/20" : "bg-gray-50"
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-brand-purple"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
            />
          </svg>
          <span className="text-sm font-medium text-brand-navy">Note</span>
          {data.isPinned && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-brand-cyan/10 text-brand-cyan">
              Pinned
            </span>
          )}
        </div>
        <span className="text-xs text-gray-500">{formatDate(new Date(data.createdAt))}</span>
      </div>

      <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.content}</p>

      <div className="mt-2 text-xs text-gray-500">{data.authorEmail}</div>
    </div>
  );
}
