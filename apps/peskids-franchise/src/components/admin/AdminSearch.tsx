"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { UsersIcon, ChatBubbleLeftRightIcon, DocumentTextIcon, AcademicCapIcon } from "@heroicons/react/24/solid";

interface SearchResult {
  id: string;
  type: "prospect" | "franchisee" | "invoice" | "conversation";
  title: string;
  subtitle: string;
  href: string;
}

interface AdminSearchProps {
  variant?: "light" | "dark";
}

export default function AdminSearch({ variant = "light" }: AdminSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Handle keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
          setSelectedIndex(0);
        }
      } catch (error) {
        console.error("Search error:", error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback(
    (result: SearchResult) => {
      router.push(result.href);
      setIsOpen(false);
      setQuery("");
    },
    [router]
  );

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      handleSelect(results[selectedIndex]);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "prospect":
        return <UsersIcon className="h-4 w-4 text-brand-purple" />;
      case "franchisee":
        return <AcademicCapIcon className="h-4 w-4 text-brand-green" />;
      case "invoice":
        return <DocumentTextIcon className="h-4 w-4 text-brand-orange" />;
      case "conversation":
        return <ChatBubbleLeftRightIcon className="h-4 w-4 text-brand-cyan" />;
      default:
        return <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <>
      {/* Search trigger button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all text-left border ${
          variant === "dark"
            ? "bg-white/10 hover:bg-white/20 border-white/10"
            : "bg-gray-50 hover:bg-gray-100 border-gray-200 hover:border-gray-300"
        }`}
      >
        <MagnifyingGlassIcon className={`h-4 w-4 flex-shrink-0 ${variant === "dark" ? "text-white/60" : "text-gray-400"}`} />
        <span className={`text-sm ${variant === "dark" ? "text-white/60" : "text-gray-500"}`}>
          Search...
        </span>
        <kbd className={`hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium rounded ml-2 ${
          variant === "dark"
            ? "text-white/40 bg-white/10 border border-white/20"
            : "text-gray-400 bg-white border border-gray-200"
        }`}>
          <span>⌘</span>K
        </kbd>
      </button>

      {/* Search modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-x-4 top-20 md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-50">
            <div className="bg-white rounded-xl shadow-2xl overflow-hidden border border-gray-200">
              {/* Search input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Search prospects, franchisees, invoices..."
                  className="flex-1 text-sm outline-none placeholder:text-gray-400 bg-transparent"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="p-1 hover:bg-gray-100 rounded transition-colors"
                  >
                    <XMarkIcon className="h-4 w-4 text-gray-400" />
                  </button>
                )}
                <kbd className="hidden sm:block px-1.5 py-0.5 text-[10px] font-medium text-gray-400 bg-gray-100 rounded border border-gray-200">
                  ESC
                </kbd>
              </div>

              {/* Results */}
              <div className="max-h-72 overflow-y-auto">
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-brand-navy border-t-transparent"></div>
                  </div>
                ) : results.length > 0 ? (
                  <ul className="py-1">
                    {results.map((result, index) => (
                      <li key={result.id}>
                        <button
                          onClick={() => handleSelect(result)}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                            index === selectedIndex
                              ? "bg-gray-50"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex-shrink-0 p-1.5 bg-gray-100 rounded-md">
                            {getIcon(result.type)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {result.title}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {result.subtitle}
                            </p>
                          </div>
                          <span className="text-[10px] text-gray-400 uppercase tracking-wide bg-gray-100 px-1.5 py-0.5 rounded">
                            {result.type}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : query ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-gray-500">No results for &quot;{query}&quot;</p>
                  </div>
                ) : (
                  <div className="py-8 text-center">
                    <MagnifyingGlassIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Type to search...</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              {results.length > 0 && (
                <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-gray-50/50 text-[10px] text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1 py-0.5 bg-white rounded border border-gray-200">↑</kbd>
                      <kbd className="px-1 py-0.5 bg-white rounded border border-gray-200">↓</kbd>
                      navigate
                    </span>
                  </div>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1 py-0.5 bg-white rounded border border-gray-200">↵</kbd>
                    select
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
