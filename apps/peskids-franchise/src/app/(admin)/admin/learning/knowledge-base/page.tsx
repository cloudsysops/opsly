"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import {
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  FunnelIcon,
  BookOpenIcon,
  ArrowPathIcon,
  EyeIcon,
  EyeSlashIcon,
  ClipboardDocumentCheckIcon,
  AcademicCapIcon,
  QuestionMarkCircleIcon,
} from "@heroicons/react/24/outline";

// ─── Types ────────────────────────────────────────────────────────────────────

type KnowledgeCategory =
  | "FRANCHISE_FAQ"
  | "BUSINESS_MODEL"
  | "TERRITORY_INFO"
  | "TRAINING_SUPPORT"
  | "TESTIMONIALS"
  | "CHESS_BENEFITS"
  | "COMPANY_INFO"
  | "INVESTMENT"
  | "PROCESS"
  | "OPERATIONS"
  | "MARKETING"
  | "SALES"
  | "LEGAL"
  | "FINANCE"
  | "ADMINISTRATION";

type WikiArticleType = "ARTICLE" | "SOP" | "GUIDE" | "FAQ";

interface KnowledgeArticle {
  id: string;
  title: string;
  category: KnowledgeCategory;
  articleType: WikiArticleType;
  isPublic: boolean;
  content: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    chunks: number;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const categoryConfig: Record<
  KnowledgeCategory,
  { label: string; bg: string; text: string }
> = {
  FRANCHISE_FAQ: { label: "Franchise FAQ", bg: "bg-blue-100", text: "text-blue-700" },
  BUSINESS_MODEL: { label: "Business Model", bg: "bg-indigo-100", text: "text-indigo-700" },
  TERRITORY_INFO: { label: "Territory Info", bg: "bg-green-100", text: "text-green-700" },
  TRAINING_SUPPORT: { label: "Training & Support", bg: "bg-purple-100", text: "text-purple-700" },
  TESTIMONIALS: { label: "Testimonials", bg: "bg-amber-100", text: "text-amber-700" },
  CHESS_BENEFITS: { label: "Chess Benefits", bg: "bg-cyan-100", text: "text-cyan-700" },
  COMPANY_INFO: { label: "Company Info", bg: "bg-slate-100", text: "text-slate-700" },
  INVESTMENT: { label: "Investment", bg: "bg-emerald-100", text: "text-emerald-700" },
  PROCESS: { label: "Process", bg: "bg-orange-100", text: "text-orange-700" },
  OPERATIONS: { label: "Operations", bg: "bg-rose-100", text: "text-rose-700" },
  MARKETING: { label: "Marketing", bg: "bg-pink-100", text: "text-pink-700" },
  SALES: { label: "Sales", bg: "bg-violet-100", text: "text-violet-700" },
  LEGAL: { label: "Legal", bg: "bg-red-100", text: "text-red-700" },
  FINANCE: { label: "Finance", bg: "bg-emerald-100", text: "text-emerald-700" },
  ADMINISTRATION: { label: "Administration", bg: "bg-slate-100", text: "text-slate-700" },
};

const articleTypeConfig: Record<WikiArticleType, { label: string; bg: string; text: string; icon: typeof BookOpenIcon }> = {
  ARTICLE: { label: "Article", bg: "bg-blue-100", text: "text-blue-700", icon: BookOpenIcon },
  SOP: { label: "SOP", bg: "bg-emerald-100", text: "text-emerald-700", icon: ClipboardDocumentCheckIcon },
  GUIDE: { label: "Guide", bg: "bg-purple-100", text: "text-purple-700", icon: AcademicCapIcon },
  FAQ: { label: "FAQ", bg: "bg-amber-100", text: "text-amber-700", icon: QuestionMarkCircleIcon },
};

const ALL_CATEGORIES: KnowledgeCategory[] = [
  "FRANCHISE_FAQ",
  "BUSINESS_MODEL",
  "TERRITORY_INFO",
  "TRAINING_SUPPORT",
  "TESTIMONIALS",
  "CHESS_BENEFITS",
  "COMPANY_INFO",
  "INVESTMENT",
  "PROCESS",
  "OPERATIONS",
  "MARKETING",
  "SALES",
  "LEGAL",
  "FINANCE",
  "ADMINISTRATION",
];

const ALL_ARTICLE_TYPES: WikiArticleType[] = ["ARTICLE", "SOP", "GUIDE", "FAQ"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin} minute${diffMin === 1 ? "" : "s"} ago`;
  if (diffHr < 24) return `${diffHr} hour${diffHr === 1 ? "" : "s"} ago`;
  if (diffDay < 7) return `${diffDay} day${diffDay === 1 ? "" : "s"} ago`;
  if (diffWeek < 5) return `${diffWeek} week${diffWeek === 1 ? "" : "s"} ago`;
  return `${diffMonth} month${diffMonth === 1 ? "" : "s"} ago`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function KnowledgeBaseListPage() {
  const [articles, setArticles] = useState<KnowledgeArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [articleTypeFilter, setArticleTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Delete confirmation
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteTitle, setDeleteTitle] = useState<string>("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchArticles = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (categoryFilter !== "all") params.set("category", categoryFilter);
      if (articleTypeFilter !== "all") params.set("articleType", articleTypeFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);

      const qs = params.toString();
      const res = await fetch(`/api/admin/knowledge-base${qs ? `?${qs}` : ""}`);
      if (!res.ok) throw new Error("Failed to fetch articles");

      const data = await res.json();
      setArticles(data.articles || []);
    } catch (err) {
      console.error("Failed to fetch knowledge base articles:", err);
      setError("Failed to load articles. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, articleTypeFilter, statusFilter]);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  async function handlePublishToggle(article: KnowledgeArticle) {
    setActionLoading(article.id);
    try {
      const res = await fetch(`/api/admin/knowledge-base/${article.id}/publish`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to toggle publish status");
      await fetchArticles();
    } catch (err) {
      console.error("Failed to toggle publish:", err);
    } finally {
      setActionLoading(null);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setActionLoading(deleteId);
    try {
      const res = await fetch(`/api/admin/knowledge-base/${deleteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete article");
      setDeleteId(null);
      setDeleteTitle("");
      await fetchArticles();
    } catch (err) {
      console.error("Failed to delete article:", err);
    } finally {
      setActionLoading(null);
    }
  }

  const publishedCount = articles.filter((a) => a.isPublic).length;
  const draftCount = articles.filter((a) => !a.isPublic).length;

  return (
    <WideContainer className="py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-3">
            <BookOpenIcon className="h-8 w-8 text-brand-navy" />
            <h1 className="text-2xl font-bold text-brand-navy">Franchise Wiki</h1>
          </div>
          <p className="text-gray-500 mt-1 text-sm">
            Articles, SOPs, guides, and how-tos — everything franchisees read to learn how we do things. Earl AI has full access to this content.
          </p>
          <p className="text-gray-500 mt-1">
            {articles.length} article{articles.length !== 1 ? "s" : ""} total
            {" \u00B7 "}
            {publishedCount} published
            {" \u00B7 "}
            {draftCount} draft{draftCount !== 1 ? "s" : ""}
          </p>
        </div>
        <Link
          href="/admin/learning/knowledge-base/new"
          className="inline-flex items-center gap-2 bg-brand-navy text-white rounded-lg px-4 py-2 hover:bg-brand-purple transition font-medium"
        >
          <PlusIcon className="h-5 w-5" />
          New Article
        </Link>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <div className="flex items-center gap-2 text-gray-500">
            <FunnelIcon className="h-5 w-5" />
            <span className="text-sm font-medium">Filters</span>
          </div>

          {/* Category */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-1.5 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
          >
            <option value="all">All Categories</option>
            {ALL_CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {categoryConfig[cat].label}
              </option>
            ))}
          </select>

          {/* Article Type */}
          <select
            value={articleTypeFilter}
            onChange={(e) => setArticleTypeFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-4 py-1.5 text-sm text-gray-700 bg-white focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
          >
            <option value="all">All Types</option>
            {ALL_ARTICLE_TYPES.map((type) => (
              <option key={type} value={type}>
                {articleTypeConfig[type].label}
              </option>
            ))}
          </select>

          {/* Status Toggle */}
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            {[
              { value: "all", label: "All" },
              { value: "published", label: "Published" },
              { value: "draft", label: "Drafts" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setStatusFilter(opt.value)}
                className={`px-3 py-1.5 text-sm font-medium transition ${
                  statusFilter === opt.value
                    ? "bg-brand-navy text-white"
                    : "bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {(categoryFilter !== "all" || articleTypeFilter !== "all" || statusFilter !== "all") && (
            <button
              onClick={() => {
                setCategoryFilter("all");
                setArticleTypeFilter("all");
                setStatusFilter("all");
              }}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading articles...</p>
        </div>
      ) : error ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <p className="text-red-500 mb-3">{error}</p>
          <button
            onClick={fetchArticles}
            className="text-brand-navy hover:text-brand-purple underline font-medium"
          >
            Try again
          </button>
        </div>
      ) : articles.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <BookOpenIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-600 mb-1">No articles found</h3>
          <p className="text-gray-400 mb-4">
            {categoryFilter !== "all" || articleTypeFilter !== "all" || statusFilter !== "all"
              ? "Try adjusting your filters."
              : "Create your first knowledge base article to get started."}
          </p>
          {categoryFilter === "all" && articleTypeFilter === "all" && statusFilter === "all" && (
            <Link
              href="/admin/learning/knowledge-base/new"
              className="inline-flex items-center gap-2 bg-brand-navy text-white rounded-lg px-4 py-2 hover:bg-brand-purple transition font-medium"
            >
              <PlusIcon className="h-5 w-5" />
              New Article
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Title
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Chunks
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {articles.map((article) => {
                  const catCfg = categoryConfig[article.category];
                  const typeCfg = articleTypeConfig[article.articleType || "ARTICLE"];
                  const TypeIcon = typeCfg.icon;
                  const isLoading = actionLoading === article.id;

                  return (
                    <tr key={article.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <TypeIcon className={`h-4 w-4 flex-shrink-0 ${typeCfg.text}`} />
                          <Link
                            href={`/admin/learning/knowledge-base/${article.id}/edit`}
                            className="text-brand-navy font-medium hover:text-brand-purple hover:underline transition"
                          >
                            {article.title}
                          </Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${catCfg.bg} ${catCfg.text}`}
                        >
                          {catCfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${typeCfg.bg} ${typeCfg.text}`}
                        >
                          {typeCfg.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {article.isPublic ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Published
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            Draft
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {article._count.chunks}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {timeAgo(article.updatedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/learning/knowledge-base/${article.id}/edit`}
                            className="inline-flex items-center gap-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition"
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                            Edit
                          </Link>
                          <button
                            onClick={() => handlePublishToggle(article)}
                            disabled={isLoading}
                            className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm transition disabled:opacity-50 ${
                              article.isPublic
                                ? "border border-gray-300 text-gray-700 hover:bg-gray-50"
                                : "bg-green-600 text-white hover:bg-green-700"
                            }`}
                          >
                            {article.isPublic ? (
                              <>
                                <EyeSlashIcon className="h-4 w-4" />
                                Unpublish
                              </>
                            ) : (
                              <>
                                <EyeIcon className="h-4 w-4" />
                                Publish
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => {
                              setDeleteId(article.id);
                              setDeleteTitle(article.title);
                            }}
                            disabled={isLoading}
                            className="inline-flex items-center gap-1 bg-red-500 text-white rounded-lg px-3 py-1.5 text-sm hover:bg-red-600 transition disabled:opacity-50"
                          >
                            <TrashIcon className="h-4 w-4" />
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteId !== null}
        title="Delete Article"
        message={`Are you sure you want to delete "${deleteTitle}"? This will also remove all associated RAG chunks. This action cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => {
          setDeleteId(null);
          setDeleteTitle("");
        }}
      />
    </WideContainer>
  );
}
