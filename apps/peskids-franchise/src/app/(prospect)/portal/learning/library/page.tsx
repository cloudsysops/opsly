"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  FolderIcon,
  MagnifyingGlassIcon,
  ArrowDownTrayIcon,
  ArrowTopRightOnSquareIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

interface Resource {
  id: string;
  title: string;
  description: string;
  category: string;
  fileUrl: string | null;
  externalUrl: string | null;
  createdAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  OPERATIONS: "Operations",
  MARKETING: "Marketing",
  SALES: "Sales",
  TRAINING: "Training",
  LEGAL: "Legal",
  FINANCIAL: "Financial",
  TEMPLATES: "Templates",
};

const CATEGORY_COLORS: Record<string, string> = {
  OPERATIONS: "bg-blue-100 text-blue-700",
  MARKETING: "bg-purple-100 text-purple-700",
  SALES: "bg-green-100 text-green-700",
  TRAINING: "bg-cyan-100 text-cyan-700",
  LEGAL: "bg-red-100 text-red-700",
  FINANCIAL: "bg-yellow-100 text-yellow-700",
  TEMPLATES: "bg-gray-100 text-gray-700",
};

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
      <div className="h-5 w-24 bg-gray-200 rounded-full mb-3" />
      <div className="h-6 w-3/4 bg-gray-200 rounded mb-3" />
      <div className="space-y-2 mb-4">
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-5/6 bg-gray-100 rounded" />
      </div>
      <div className="h-9 w-32 bg-gray-100 rounded-lg" />
    </div>
  );
}

export default function ResourceLibraryPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchResources = useCallback(
    async (search?: string, category?: string | null) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (category) params.set("category", category);

        const res = await fetch(
          `/api/franchisee/resources?${params.toString()}`
        );
        if (res.ok) {
          const data = await res.json();
          setResources(data.resources);
        }
      } catch (error) {
        console.error("Error fetching resources:", error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchResources();
  }, [fetchResources]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      fetchResources(value, selectedCategory);
    }, 300);
  };

  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category);
    fetchResources(searchQuery, category);
  };

  const availableCategories = Array.from(
    new Set(resources.map((r) => r.category))
  ).sort();

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-brand-light rounded-lg">
            <FolderIcon className="h-7 w-7 text-brand-navy" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">
              Resource Library
            </h1>
            <p className="text-gray-500 text-sm">
              Download templates, checklists, spreadsheets, and tools
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search resources..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
          />
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-8">
        <button
          onClick={() => handleCategoryChange(null)}
          className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
            selectedCategory === null
              ? "bg-brand-navy text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:border-brand-navy"
          }`}
        >
          All
        </button>
        {availableCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => handleCategoryChange(cat)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === cat
                ? "bg-brand-navy text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:border-brand-navy"
            }`}
          >
            {CATEGORY_LABELS[cat] || cat}
          </button>
        ))}
      </div>

      {/* Resources Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : resources.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16">
          <FolderIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No resources available yet
          </h3>
          {searchQuery ? (
            <p className="text-gray-500">
              Try different search terms or clear your filters.
            </p>
          ) : (
            <p className="text-gray-500">
              Resources will appear here once they are published.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
            >
              <span
                className={`inline-block self-start px-2.5 py-0.5 rounded-full text-xs font-medium mb-3 ${
                  CATEGORY_COLORS[resource.category] ||
                  "bg-gray-100 text-gray-700"
                }`}
              >
                {CATEGORY_LABELS[resource.category] || resource.category}
              </span>
              <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                {resource.title}
              </h3>
              <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3 flex-1">
                {resource.description}
              </p>
              {resource.fileUrl ? (
                <a
                  href={resource.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  download
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-navy text-white text-sm font-medium rounded-lg hover:bg-brand-navy/90 transition-colors self-start"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Download
                </a>
              ) : resource.externalUrl ? (
                <a
                  href={resource.externalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-brand-cyan text-brand-navy text-sm font-medium rounded-lg hover:bg-brand-cyan/80 transition-colors self-start"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" />
                  Open Link
                </a>
              ) : (
                <div className="flex items-center gap-1.5 text-gray-400 text-sm self-start">
                  <DocumentTextIcon className="h-4 w-4" />
                  Content only
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
