"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  BookOpenIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  AcademicCapIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

interface Article {
  id: string;
  title: string;
  slug: string;
  category: string;
  articleType: string;
  excerpt: string;
  scope: string;
  updatedAt: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  FRANCHISE_FAQ: "FAQ",
  BUSINESS_MODEL: "Business Model",
  TERRITORY_INFO: "Territory",
  TRAINING_SUPPORT: "Training & Support",
  TESTIMONIALS: "Testimonials",
  CHESS_BENEFITS: "Chess Benefits",
  COMPANY_INFO: "Company Info",
  INVESTMENT: "Investment",
  PROCESS: "Process",
  OPERATIONS: "Operations",
  MARKETING: "Marketing",
  SALES: "Sales",
  LEGAL: "Legal",
};

const CATEGORY_COLORS: Record<string, string> = {
  FRANCHISE_FAQ: "bg-blue-100 text-blue-700",
  BUSINESS_MODEL: "bg-indigo-100 text-indigo-700",
  TERRITORY_INFO: "bg-green-100 text-green-700",
  TRAINING_SUPPORT: "bg-purple-100 text-purple-700",
  TESTIMONIALS: "bg-amber-100 text-amber-700",
  CHESS_BENEFITS: "bg-cyan-100 text-cyan-700",
  COMPANY_INFO: "bg-slate-100 text-slate-700",
  INVESTMENT: "bg-emerald-100 text-emerald-700",
  PROCESS: "bg-orange-100 text-orange-700",
  OPERATIONS: "bg-rose-100 text-rose-700",
  MARKETING: "bg-pink-100 text-pink-700",
  SALES: "bg-teal-100 text-teal-700",
  LEGAL: "bg-gray-100 text-gray-700",
};

const ARTICLE_TYPE_ICONS: Record<string, typeof BookOpenIcon> = {
  ARTICLE: BookOpenIcon,
  SOP: ClipboardDocumentCheckIcon,
  GUIDE: AcademicCapIcon,
  FAQ: QuestionMarkCircleIcon,
};

const ARTICLE_TYPES = [
  { value: null as string | null, label: "All Types", icon: null },
  { value: "ARTICLE", label: "Articles", icon: BookOpenIcon },
  { value: "SOP", label: "SOPs", icon: ClipboardDocumentCheckIcon },
  { value: "GUIDE", label: "Guides", icon: AcademicCapIcon },
  { value: "FAQ", label: "FAQs", icon: QuestionMarkCircleIcon },
];

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
      <div className="h-5 w-24 bg-gray-200 rounded-full mb-3" />
      <div className="h-6 w-3/4 bg-gray-200 rounded mb-3" />
      <div className="space-y-2 mb-4">
        <div className="h-4 w-full bg-gray-100 rounded" />
        <div className="h-4 w-5/6 bg-gray-100 rounded" />
      </div>
      <div className="h-3 w-28 bg-gray-100 rounded" />
    </div>
  );
}

export default function KnowledgeBasePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  const fetchArticles = useCallback(
    async (
      search?: string,
      category?: string | null,
      type?: string | null
    ) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        if (category) params.set("category", category);
        if (type) params.set("articleType", type);

        const res = await fetch(
          `/api/franchisee/knowledge-base?${params.toString()}`
        );
        if (res.ok) {
          const data = await res.json();
          setArticles(data.articles);
        }
      } catch (error) {
        console.error("Error fetching articles:", error);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      fetchArticles(value, selectedCategory, selectedType);
    }, 300);
  };

  const handleCategoryChange = (category: string | null) => {
    setSelectedCategory(category);
    fetchArticles(searchQuery, category, selectedType);
  };

  const handleTypeChange = (type: string | null) => {
    setSelectedType(type);
    fetchArticles(searchQuery, selectedCategory, type);
  };

  // Get unique categories from articles for the filter chips
  const availableCategories = Array.from(
    new Set(articles.map((a) => a.category))
  ).sort();

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-brand-light rounded-lg">
            <BookOpenIcon className="h-7 w-7 text-brand-navy" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">
              Franchise Wiki
            </h1>
            <p className="text-gray-500 text-sm">
              Guides, SOPs, and how-tos for running your franchise
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
            placeholder="Search articles..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-12 pr-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-cyan focus:ring-2 focus:ring-brand-cyan/20 transition-colors"
          />
        </div>
      </div>

      {/* Article Type Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {ARTICLE_TYPES.map((typeOption) => {
          const Icon = typeOption.icon;
          return (
            <button
              key={typeOption.label}
              onClick={() => handleTypeChange(typeOption.value)}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                selectedType === typeOption.value
                  ? "bg-brand-navy text-white"
                  : "bg-white border border-gray-200 text-gray-600 hover:border-brand-navy"
              }`}
            >
              {Icon && <Icon className="h-4 w-4" />}
              {typeOption.label}
            </button>
          );
        })}
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

      {/* Articles Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : articles.length === 0 ? (
        /* Empty State */
        <div className="text-center py-16">
          <DocumentTextIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            No articles found
          </h3>
          {searchQuery ? (
            <p className="text-gray-500">
              Try different search terms or clear your filters.
            </p>
          ) : (
            <div>
              <p className="text-gray-500 mb-4">
                No articles available yet. Have a question? Ask Earl!
              </p>
              <Link
                href="/portal/learning/coach"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-cyan text-brand-navy font-semibold rounded-lg hover:bg-opacity-80 transition-colors"
              >
                Ask Earl
              </Link>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => {
            const TypeIcon = ARTICLE_TYPE_ICONS[article.articleType] || BookOpenIcon;
            return (
              <Link
                key={article.id}
                href={`/wiki/${article.slug || article.id}`}
                className="group bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      CATEGORY_COLORS[article.category] ||
                      "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {CATEGORY_LABELS[article.category] || article.category}
                  </span>
                  <TypeIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-brand-navy transition-colors line-clamp-2">
                  {article.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">
                  {article.excerpt}
                </p>
                <p className="text-xs text-gray-400">
                  Updated {formatDate(article.updatedAt)}
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
