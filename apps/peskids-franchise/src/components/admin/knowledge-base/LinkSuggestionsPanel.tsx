"use client";

import { useState, useEffect } from "react";
import {
  XMarkIcon,
  LinkIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  BookOpenIcon,
  ClipboardDocumentCheckIcon,
  AcademicCapIcon,
  QuestionMarkCircleIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

interface Suggestion {
  articleId: string;
  articleTitle: string;
  articleSlug: string;
  articleType: string;
  matchType: "title" | "semantic";
  matchDetail: string;
  matchedText: string;
  confidence: number;
}

interface LinkSuggestionsPanelProps {
  articleId: string;
  isOpen: boolean;
  onClose: () => void;
  onLinksApplied: () => void;
}

const ARTICLE_TYPE_ICONS: Record<string, typeof BookOpenIcon> = {
  ARTICLE: BookOpenIcon,
  SOP: ClipboardDocumentCheckIcon,
  GUIDE: AcademicCapIcon,
  FAQ: QuestionMarkCircleIcon,
};

const ARTICLE_TYPE_COLORS: Record<string, string> = {
  ARTICLE: "bg-blue-100 text-blue-700",
  SOP: "bg-purple-100 text-purple-700",
  GUIDE: "bg-green-100 text-green-700",
  FAQ: "bg-amber-100 text-amber-700",
};

export function LinkSuggestionsPanel({
  articleId,
  isOpen,
  onClose,
  onLinksApplied,
}: LinkSuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set());
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [anyApplied, setAnyApplied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    setError(null);
    setSuggestions([]);
    setAppliedIds(new Set());
    setAnyApplied(false);

    fetch(`/api/admin/knowledge-base/${articleId}/suggestions`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load suggestions");
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      })
      .catch((err) => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, articleId]);

  async function handleApplyLink(suggestion: Suggestion) {
    setApplyingId(suggestion.articleId);
    try {
      const res = await fetch(
        `/api/admin/knowledge-base/${articleId}/apply-link`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetArticleId: suggestion.articleId,
            targetSlug: suggestion.articleSlug,
            targetTitle: suggestion.articleTitle,
            matchedText: suggestion.matchedText,
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to apply link");
      }

      setAppliedIds((prev) => new Set([...prev, suggestion.articleId]));
      setAnyApplied(true);
    } catch (err) {
      console.error("Failed to apply link:", err);
    } finally {
      setApplyingId(null);
    }
  }

  function handleClose() {
    if (anyApplied) {
      onLinksApplied();
    }
    onClose();
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <SparklesIcon className="h-5 w-5 text-brand-purple" />
            <h2 className="text-lg font-semibold text-gray-900">
              Link Suggestions
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading && (
            <div className="flex flex-col items-center py-12 text-gray-500">
              <ArrowPathIcon className="h-8 w-8 animate-spin mb-3" />
              <p className="text-sm">Scanning for link opportunities...</p>
            </div>
          )}

          {error && (
            <div className="text-center py-12">
              <p className="text-sm text-red-500">{error}</p>
            </div>
          )}

          {!loading && !error && suggestions.length === 0 && (
            <div className="flex flex-col items-center py-12 text-gray-500">
              <CheckCircleIcon className="h-10 w-10 text-green-400 mb-3" />
              <p className="font-medium text-gray-700">No link suggestions found</p>
              <p className="text-sm mt-1">This article is well-connected!</p>
            </div>
          )}

          {!loading && !error && suggestions.length > 0 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">
                {suggestions.length} article{suggestions.length !== 1 ? "s" : ""} could be linked from this content.
              </p>

              {suggestions.map((suggestion) => {
                const Icon = ARTICLE_TYPE_ICONS[suggestion.articleType] || BookOpenIcon;
                const colorClass = ARTICLE_TYPE_COLORS[suggestion.articleType] || "bg-gray-100 text-gray-700";
                const isApplied = appliedIds.has(suggestion.articleId);
                const isApplying = applyingId === suggestion.articleId;

                return (
                  <div
                    key={suggestion.articleId}
                    className={`border rounded-lg p-4 transition ${
                      isApplied
                        ? "border-green-200 bg-green-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                            <Icon className="h-3 w-3" />
                            {suggestion.articleType}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                            suggestion.matchType === "title"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-purple-50 text-purple-600"
                          }`}>
                            {suggestion.matchType === "title" ? (
                              <MagnifyingGlassIcon className="h-3 w-3" />
                            ) : (
                              <SparklesIcon className="h-3 w-3" />
                            )}
                            {suggestion.matchType === "title" ? "Text match" : "AI match"}
                          </span>
                        </div>
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {suggestion.articleTitle}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {suggestion.matchDetail}
                        </p>
                      </div>

                      <div className="flex-shrink-0">
                        {isApplied ? (
                          <span className="inline-flex items-center gap-1 text-green-600 text-sm font-medium">
                            <CheckCircleIcon className="h-5 w-5" />
                            Linked
                          </span>
                        ) : (
                          <button
                            onClick={() => handleApplyLink(suggestion)}
                            disabled={isApplying}
                            className="inline-flex items-center gap-1 bg-brand-navy text-white rounded-lg px-3 py-1.5 text-sm font-medium hover:bg-brand-purple transition disabled:opacity-50"
                          >
                            {isApplying ? (
                              <ArrowPathIcon className="h-4 w-4 animate-spin" />
                            ) : (
                              <LinkIcon className="h-4 w-4" />
                            )}
                            Link
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-3 flex justify-end gap-3">
          {!loading && suggestions.length > 0 && !allApplied(suggestions, appliedIds) && (
            <button
              onClick={handleClose}
              className="text-sm text-gray-500 hover:text-gray-700 transition"
            >
              Skip All
            </button>
          )}
          <button
            onClick={handleClose}
            className="bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-medium hover:bg-gray-200 transition"
          >
            {anyApplied ? "Done" : "Close"}
          </button>
        </div>
      </div>
    </div>
  );
}

function allApplied(suggestions: Suggestion[], appliedIds: Set<string>): boolean {
  return suggestions.length > 0 && suggestions.every((s) => appliedIds.has(s.articleId));
}
