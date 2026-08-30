"use client";

import { useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/utils";

interface Message {
  id: string;
  type: "email" | "sms";
  prospectId: string;
  prospectName: string;
  prospectEmail: string;
  prospectPhone?: string;
  direction: "inbound" | "outbound";
  subject?: string;
  preview: string;
  status: string;
  sentBy: string | null;
  sentAt: Date;
}

interface MessageListProps {
  initialMessages: Message[];
}

type FilterType = "all" | "email" | "sms" | "inbound";

export function MessageList({ initialMessages }: MessageListProps) {
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");

  const filteredMessages = initialMessages.filter((msg) => {
    // Type filter
    if (filter === "email" && msg.type !== "email") return false;
    if (filter === "sms" && msg.type !== "sms") return false;
    if (filter === "inbound" && msg.direction !== "inbound") return false;

    // Search filter
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        msg.prospectName.toLowerCase().includes(searchLower) ||
        msg.prospectEmail.toLowerCase().includes(searchLower) ||
        (msg.subject && msg.subject.toLowerCase().includes(searchLower)) ||
        msg.preview.toLowerCase().includes(searchLower)
      );
    }

    return true;
  });

  return (
    <div className="bg-white rounded-lg border">
      {/* Filters */}
      <div className="p-4 border-b flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
        <div className="flex gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === "all"
                ? "bg-brand-navy text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter("email")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === "email"
                ? "bg-brand-cyan text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Email
          </button>
          <button
            onClick={() => setFilter("sms")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === "sms"
                ? "bg-green-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            SMS
          </button>
          <button
            onClick={() => setFilter("inbound")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === "inbound"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Inbound
          </button>
        </div>

        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search messages..."
            className="w-full sm:w-64 pl-10 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
          />
          <svg
            className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Message List */}
      <div className="divide-y">
        {filteredMessages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p>No messages found</p>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <MessageRow key={`${msg.type}-${msg.id}`} message={msg} />
          ))
        )}
      </div>
    </div>
  );
}

function MessageRow({ message }: { message: Message }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="hover:bg-gray-50 transition-colors">
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            message.type === "email"
              ? "bg-brand-cyan/10"
              : message.direction === "inbound"
              ? "bg-blue-100"
              : "bg-green-100"
          }`}>
            {message.type === "email" ? (
              <svg className="w-5 h-5 text-brand-cyan" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            ) : message.direction === "inbound" ? (
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {message.prospectId ? (
                <Link
                  href={`/admin/prospects/${message.prospectId}`}
                  className="font-medium text-gray-900 hover:text-brand-cyan"
                  onClick={(e) => e.stopPropagation()}
                >
                  {message.prospectName}
                </Link>
              ) : (
                <span className="font-medium text-gray-900">{message.prospectName}</span>
              )}
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                message.type === "email"
                  ? "bg-brand-cyan/10 text-brand-cyan"
                  : message.direction === "inbound"
                  ? "bg-blue-100 text-blue-700"
                  : "bg-green-100 text-green-700"
              }`}>
                {message.type === "email" ? "Email" : message.direction === "inbound" ? "SMS In" : "SMS Out"}
              </span>
              {message.status && message.status !== "sent" && (
                <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs ${
                  message.status === "delivered" || message.status === "received"
                    ? "bg-green-100 text-green-700"
                    : message.status === "failed"
                    ? "bg-red-100 text-red-700"
                    : "bg-gray-100 text-gray-600"
                }`}>
                  {message.status}
                </span>
              )}
            </div>

            {message.subject && (
              <div className="text-sm font-medium text-gray-700 mb-1 truncate">
                {message.subject}
              </div>
            )}

            <div className="text-sm text-gray-500 line-clamp-1">
              {message.preview}
            </div>
          </div>

          {/* Meta */}
          <div className="text-right flex-shrink-0">
            <div className="text-sm text-gray-500">
              {formatDate(new Date(message.sentAt))}
            </div>
            {message.sentBy && (
              <div className="text-xs text-gray-400 mt-1">
                {message.sentBy.includes("system") ? "System" : message.sentBy.split("@")[0]}
              </div>
            )}
          </div>

          {/* Expand indicator */}
          <svg
            className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4">
          <div className="ml-14 p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-700 whitespace-pre-wrap">
              {message.preview}
            </div>
            <div className="mt-3 pt-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
              <div>
                {message.type === "email" ? (
                  <span>To: {message.prospectEmail}</span>
                ) : (
                  <span>{message.direction === "inbound" ? "From" : "To"}: {message.prospectPhone}</span>
                )}
              </div>
              {message.prospectId && (
                <Link
                  href={`/admin/prospects/${message.prospectId}`}
                  className="text-brand-cyan hover:underline"
                >
                  View Prospect
                </Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
