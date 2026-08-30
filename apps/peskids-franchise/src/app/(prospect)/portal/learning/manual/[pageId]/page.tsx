"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import DOMPurify from "dompurify";
import {
  ArrowLeftIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

interface PageData {
  id: string;
  title: string;
  slug: string;
  content: string;
  excerpt: string | null;
  requiresAcknowledgment: boolean;
  currentVersion: number;
  updatedAt: string;
  section: {
    id: string;
    title: string;
    icon: string;
  };
}

interface SiblingPage {
  id: string;
  title: string;
}

export default function ManualPageDetail() {
  const { pageId } = useParams<{ pageId: string }>();
  const [page, setPage] = useState<PageData | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [prevPage, setPrevPage] = useState<SiblingPage | null>(null);
  const [nextPage, setNextPage] = useState<SiblingPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Acknowledgment UI
  const [ackChecked, setAckChecked] = useState(false);
  const [ackSubmitting, setAckSubmitting] = useState(false);

  useEffect(() => {
    async function fetchPage() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/franchisee/operations/manual/${pageId}`
        );
        if (!res.ok) {
          if (res.status === 403) {
            setError("Access restricted to selected franchisees.");
          } else if (res.status === 404) {
            setError("Page not found.");
          } else {
            throw new Error("Failed to load page");
          }
          return;
        }
        const data = await res.json();
        setPage(data.page);
        setAcknowledged(data.acknowledged);
        setPrevPage(data.prevPage);
        setNextPage(data.nextPage);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    if (pageId) fetchPage();
  }, [pageId]);

  // Scroll to hash anchor after content loads, or scroll to top if no hash
  useEffect(() => {
    if (!page) return;
    const hash = window.location.hash;
    if (hash) {
      // Use getElementById instead of querySelector — IDs starting with
      // digits (e.g. "1-2-introduction-...") are invalid CSS selectors
      // and querySelector throws a SyntaxError.
      const id = hash.slice(1);
      // Brief delay so the dangerouslySetInnerHTML content is painted
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [page, pageId]);

  const handleAcknowledge = async () => {
    if (!page || !ackChecked) return;
    setAckSubmitting(true);
    try {
      const res = await fetch(
        `/api/franchisee/operations/manual/${page.id}/acknowledge`,
        { method: "POST" }
      );
      if (res.ok) {
        setAcknowledged(true);
        setAckChecked(false);
      }
    } catch {
      // Silently fail
    } finally {
      setAckSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm text-slate-500">Loading page...</p>
        </div>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
        <Link
          href="/portal/learning/manual"
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-navy transition-colors mb-6"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Operations Manual
        </Link>
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center max-w-md">
            <h2 className="text-xl font-semibold text-red-700 mb-2">
              {error || "Page not found"}
            </h2>
          </div>
        </div>
      </div>
    );
  }

  const needsAck = page.requiresAcknowledgment && !acknowledged;

  // Content is sanitized with DOMPurify before rendering
  const sanitizedContent = DOMPurify.sanitize(page.content);

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Back link */}
      <Link
        href="/portal/learning/manual"
        className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-brand-navy transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Operations Manual
      </Link>

      {/* Page header */}
      <div className="mt-4 mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <span>{page.section.icon}</span>
          <span>{page.section.title}</span>
        </div>
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {page.title}
          </h1>
          {acknowledged && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-green-50 text-green-700 text-xs font-medium rounded-full flex-shrink-0 border border-green-200">
              <CheckCircleIcon className="h-4 w-4" />
              Acknowledged
            </span>
          )}
          {needsAck && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 text-xs font-medium rounded-full flex-shrink-0 border border-amber-200">
              <ExclamationTriangleIcon className="h-4 w-4" />
              Needs Acknowledgment
            </span>
          )}
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Last updated:{" "}
          {new Date(page.updatedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Content — sanitized via DOMPurify */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 sm:p-8 mb-6">
        <div
          className="prose prose-slate max-w-none prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline"
          dangerouslySetInnerHTML={{ __html: sanitizedContent }}
        />
      </div>

      {/* Acknowledgment */}
      {needsAck && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6">
          <div className="flex items-start gap-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-amber-900 mb-2">
                Acknowledgment Required
              </h3>
              <p className="text-sm text-amber-800 mb-4">
                Please confirm that you have read and understand this content.
              </p>
              <label className="flex items-start gap-2 cursor-pointer mb-4">
                <input
                  type="checkbox"
                  checked={ackChecked}
                  onChange={(e) => setAckChecked(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-sm text-slate-700">
                  I have read and understand this content
                </span>
              </label>
              <button
                onClick={handleAcknowledge}
                disabled={!ackChecked || ackSubmitting}
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {ackSubmitting ? "Submitting..." : "Acknowledge"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prev / Next navigation */}
      <div className="flex items-stretch gap-4">
        {prevPage ? (
          <Link
            href={`/portal/learning/manual/${prevPage.id}`}
            className="flex-1 flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group"
          >
            <ChevronLeftIcon className="h-5 w-5 text-slate-400 group-hover:text-indigo-500 flex-shrink-0" />
            <div className="min-w-0">
              <span className="text-xs text-slate-400 uppercase tracking-wide">
                Previous
              </span>
              <p className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 truncate">
                {prevPage.title}
              </p>
            </div>
          </Link>
        ) : (
          <div className="flex-1" />
        )}
        {nextPage ? (
          <Link
            href={`/portal/learning/manual/${nextPage.id}`}
            className="flex-1 flex items-center justify-end gap-3 px-4 py-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group text-right"
          >
            <div className="min-w-0">
              <span className="text-xs text-slate-400 uppercase tracking-wide">
                Next
              </span>
              <p className="text-sm font-medium text-slate-700 group-hover:text-indigo-600 truncate">
                {nextPage.title}
              </p>
            </div>
            <ChevronRightIcon className="h-5 w-5 text-slate-400 group-hover:text-indigo-500 flex-shrink-0" />
          </Link>
        ) : (
          <div className="flex-1" />
        )}
      </div>
    </div>
  );
}
