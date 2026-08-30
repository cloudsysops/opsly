"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BookOpenIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";

interface ManualPage {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  requiresAcknowledgment: boolean;
  orderIndex: number;
  updatedAt: string;
  acknowledged: boolean;
  needsAcknowledgment: boolean;
}

interface ManualSection {
  id: string;
  title: string;
  slug: string;
  icon: string;
  description: string | null;
  pages: ManualPage[];
}

interface SearchResult {
  pageId: string;
  pageTitle: string;
  sectionTitle: string;
  snippet: string;
}

export default function OperationsManualPage() {
  const [sections, setSections] = useState<ManualSection[]>([]);
  const [pendingAcks, setPendingAcks] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    async function fetchManual() {
      try {
        const res = await fetch("/api/franchisee/operations/manual");
        if (res.status === 403) {
          setForbidden(true);
          setLoading(false);
          return;
        }
        if (!res.ok) throw new Error("Failed to load operations manual");
        const data = await res.json();
        setSections(data.sections || []);
        setPendingAcks(data.pendingAcks ?? 0);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }
    fetchManual();
  }, []);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearchLoading(true);
      setShowSearchResults(true);
      try {
        const res = await fetch(
          `/api/franchisee/operations/manual/search?q=${encodeURIComponent(value)}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data.results || []);
        }
      } catch {
        // Silently fail
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, []);

  if (forbidden) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            Access Restricted
          </h2>
          <p className="text-slate-600">
            The Operations Manual is available to selected franchisees only.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm text-slate-500">
            Loading operations manual...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-red-700 mb-2">Error</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  const totalPages = sections.reduce((sum, s) => sum + s.pages.length, 0);
  const ackdPages = sections.reduce(
    (sum, s) => sum + s.pages.filter((p) => p.acknowledged).length,
    0
  );

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <BookOpenIcon className="h-8 w-8 text-brand-navy" />
          <h1 className="text-2xl font-bold text-slate-900">
            Operations Manual
          </h1>
        </div>
        <p className="text-sm text-slate-500 ml-11">
          Policies, procedures, and guidelines for your franchise
        </p>
      </div>

      {/* Pending acks + progress banner */}
      {pendingAcks > 0 && (
        <div className="mb-6 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-center gap-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">
              {pendingAcks} {pendingAcks === 1 ? "page requires" : "pages require"}{" "}
              your acknowledgment
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Look for the warning icons below to find pages that need attention
            </p>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {totalPages > 0 && (
        <div className="mb-6 bg-white border border-slate-200 rounded-lg px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-slate-700">
              Reading Progress
            </span>
            <span className="text-sm text-slate-500">
              {ackdPages} of {totalPages} pages acknowledged
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all duration-500"
              style={{
                width: `${totalPages > 0 ? (ackdPages / totalPages) * 100 : 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Search */}
      <div className="mb-8 relative" ref={searchRef}>
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search the operations manual..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        {showSearchResults && (
          <div className="absolute z-20 top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-80 overflow-y-auto">
            {searchLoading ? (
              <div className="px-4 py-3 text-sm text-slate-500">
                Searching...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500">
                No results found
              </div>
            ) : (
              searchResults.map((result) => (
                <Link
                  key={result.pageId}
                  href={`/portal/learning/manual/${result.pageId}`}
                  className="block w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-b-0 transition-colors"
                >
                  <div className="text-sm font-medium text-slate-800">
                    {result.pageTitle}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    {result.sectionTitle}
                  </div>
                  {result.snippet && (
                    <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {result.snippet}
                    </div>
                  )}
                </Link>
              ))
            )}
          </div>
        )}
      </div>

      {/* Section cards */}
      <div className="space-y-4">
        {sections.map((section) => {
          const sectionAcked = section.pages.filter((p) => p.acknowledged).length;
          const sectionNeedsAck = section.pages.some((p) => p.needsAcknowledgment);

          return (
            <div
              key={section.id}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden"
            >
              {/* Section header */}
              <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{section.icon}</span>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">
                        {section.title}
                      </h2>
                      {section.description && (
                        <p className="text-sm text-slate-500 mt-0.5">
                          {section.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {sectionNeedsAck && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs font-medium rounded-full border border-amber-200">
                        <ExclamationTriangleIcon className="h-3.5 w-3.5" />
                        Action needed
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {sectionAcked}/{section.pages.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Page list */}
              <div className="divide-y divide-slate-100">
                {section.pages.map((page) => (
                  <Link
                    key={page.id}
                    href={`/portal/learning/manual/${page.id}`}
                    className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-800 group-hover:text-indigo-600 transition-colors truncate">
                          {page.title}
                        </span>
                      </div>
                      {page.excerpt && (
                        <p className="text-xs text-slate-400 mt-0.5 truncate">
                          {page.excerpt}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {page.acknowledged && (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      )}
                      {page.needsAcknowledgment && (
                        <ExclamationTriangleIcon className="h-5 w-5 text-amber-500" />
                      )}
                      <ChevronRightIcon className="h-4 w-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })}

        {sections.length === 0 && (
          <div className="text-center py-16">
            <BookOpenIcon className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500">
              No manual content available yet.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
