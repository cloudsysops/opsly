"use client";

import { useState, useEffect, useRef, useCallback } from "react";

interface WikiArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  articleType: string;
}

interface WikiLinkPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (article: { id: string; title: string; slug: string }) => void;
}

const ARTICLE_TYPE_ICONS: Record<string, string> = {
  ARTICLE: "📄",
  SOP: "📋",
  GUIDE: "📘",
  FAQ: "❓",
};

const CATEGORY_COLORS: Record<string, string> = {
  OPERATIONS: "bg-emerald-100 text-emerald-700",
  MARKETING: "bg-purple-100 text-purple-700",
  SALES: "bg-amber-100 text-amber-700",
  TRAINING: "bg-blue-100 text-blue-700",
  FINANCE: "bg-red-100 text-red-700",
  GENERAL: "bg-gray-100 text-gray-700",
};

export function WikiLinkPicker({ isOpen, onClose, onSelect }: WikiLinkPickerProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<WikiArticle[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setSearch("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const fetchArticles = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query) params.set("search", query);
      const res = await fetch(`/api/admin/knowledge-base?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.articles || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  // Load all articles initially, then debounce search
  useEffect(() => {
    if (!isOpen) return;
    fetchArticles("");
  }, [isOpen, fetchArticles]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchArticles(value);
    }, 300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="p-6 pb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-brand-navy">
              Insert Wiki Link
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <input
            ref={inputRef}
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search wiki articles..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-navy/50 focus:border-brand-navy"
          />
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-4 min-h-0">
          {loading && results.length === 0 ? (
            <div className="text-center text-gray-500 py-8 text-sm">
              Searching...
            </div>
          ) : results.length === 0 ? (
            <div className="text-center text-gray-500 py-8 text-sm">
              {search ? "No articles found" : "No wiki articles yet"}
            </div>
          ) : (
            <div className="space-y-1">
              {results.map((article) => {
                const categoryClass =
                  CATEGORY_COLORS[article.category] || CATEGORY_COLORS.GENERAL;
                const typeIcon =
                  ARTICLE_TYPE_ICONS[article.articleType] || ARTICLE_TYPE_ICONS.ARTICLE;

                return (
                  <button
                    key={article.id}
                    type="button"
                    onClick={() =>
                      onSelect({
                        id: article.id,
                        title: article.title,
                        slug: article.slug,
                      })
                    }
                    className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-3 group"
                  >
                    <span className="text-lg flex-shrink-0" title={article.articleType}>
                      {typeIcon}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 group-hover:text-brand-navy truncate">
                        {article.title}
                      </div>
                    </div>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${categoryClass}`}
                    >
                      {article.category}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t px-6 py-3">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
