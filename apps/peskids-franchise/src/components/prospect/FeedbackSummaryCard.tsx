'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ChatBubbleBottomCenterTextIcon,
  ArrowRightIcon,
  CheckBadgeIcon,
} from '@heroicons/react/24/outline';

interface ChangelogEntry {
  id: string;
  title: string;
  description: string;
  category: string | null;
  publishedAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  feature: 'bg-brand-purple/10 text-brand-purple',
  improvement: 'bg-brand-cyan/10 text-brand-cyan',
  fix: 'bg-brand-green/10 text-brand-green',
  content: 'bg-brand-orange/10 text-brand-orange',
};

function getCategoryStyle(category: string | null): string {
  if (!category) return 'bg-gray-100 text-gray-600';
  return CATEGORY_COLORS[category.toLowerCase()] || 'bg-gray-100 text-gray-600';
}

function formatDate(dateStr: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(dateStr));
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength).trimEnd() + '...';
}

export default function FeedbackSummaryCard() {
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/franchisee/feedback/changelog')
      .then((res) => res.json())
      .then((data) => {
        setChangelog((data.changelog || []).slice(0, 3));
        setFeedbackCount(data.feedbackCount || 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 rounded w-2/3" />
          <div className="h-4 bg-gray-100 rounded w-1/2" />
          <div className="h-4 bg-gray-100 rounded w-3/4" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="p-2 rounded-xl bg-brand-purple/10">
          <ChatBubbleBottomCenterTextIcon className="h-5 w-5 text-brand-purple" />
        </div>
        <div>
          <h3 className="font-display text-base font-semibold text-gray-900">
            Your Feedback Matters
          </h3>
          {feedbackCount > 0 && (
            <p className="text-xs text-gray-500">
              You&apos;ve submitted {feedbackCount} feedback{feedbackCount !== 1 ? ' items' : ' item'}
            </p>
          )}
        </div>
      </div>

      {/* Changelog entries */}
      {changelog.length > 0 ? (
        <div className="space-y-2.5 mb-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Recent Improvements
          </p>
          {changelog.map((entry) => (
            <div
              key={entry.id}
              className="flex items-start gap-2.5 p-2.5 rounded-lg bg-gray-50"
            >
              <CheckBadgeIcon className="h-4 w-4 text-brand-green flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {entry.title}
                  </p>
                  {entry.category && (
                    <span
                      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${getCategoryStyle(
                        entry.category
                      )}`}
                    >
                      {entry.category}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  {truncate(entry.description, 80)}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {formatDate(entry.publishedAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gray-500 mb-4">
          We&apos;re listening! Your feedback helps shape the portal.
        </p>
      )}

      {/* CTA */}
      <Link
        href="/portal/feedback"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-purple hover:text-brand-navy transition-colors"
      >
        Share Feedback <ArrowRightIcon className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}
