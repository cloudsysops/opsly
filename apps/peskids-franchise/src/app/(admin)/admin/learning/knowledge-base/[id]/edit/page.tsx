"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { TipTapEditor } from "@/components/shared/TipTapEditor";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import { LinkSuggestionsPanel } from "@/components/admin/knowledge-base/LinkSuggestionsPanel";
import {
  ArrowLeftIcon,
  TrashIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  BookOpenIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentIcon,
  AcademicCapIcon,
  QuestionMarkCircleIcon,
  LinkIcon,
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
  slug: string;
  category: KnowledgeCategory;
  articleType: WikiArticleType;
  sopVersion: string | null;
  sopOwner: string | null;
  sopRequired: boolean;
  authorName: string | null;
  authorImage: string | null;
  isPublic: boolean;
  content: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    chunks: number;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES: { value: KnowledgeCategory; label: string }[] = [
  { value: "FRANCHISE_FAQ", label: "Franchise FAQ" },
  { value: "BUSINESS_MODEL", label: "Business Model" },
  { value: "TERRITORY_INFO", label: "Territory Info" },
  { value: "TRAINING_SUPPORT", label: "Training & Support" },
  { value: "TESTIMONIALS", label: "Testimonials" },
  { value: "CHESS_BENEFITS", label: "Chess Benefits" },
  { value: "COMPANY_INFO", label: "Company Info" },
  { value: "INVESTMENT", label: "Investment" },
  { value: "PROCESS", label: "Process" },
  { value: "OPERATIONS", label: "Operations" },
  { value: "MARKETING", label: "Marketing" },
  { value: "SALES", label: "Sales" },
  { value: "LEGAL", label: "Legal" },
  { value: "FINANCE", label: "Finance" },
  { value: "ADMINISTRATION", label: "Administration" },
];

const ARTICLE_TYPES: { value: WikiArticleType; label: string; description: string; icon: typeof BookOpenIcon }[] = [
  { value: "ARTICLE", label: "Article", description: "Knowledge article — reference material, context, background", icon: BookOpenIcon },
  { value: "SOP", label: "SOP", description: "Standard Operating Procedure — step-by-step instructions", icon: ClipboardDocumentCheckIcon },
  { value: "GUIDE", label: "Guide", description: "Guide — tutorial or walkthrough", icon: AcademicCapIcon },
  { value: "FAQ", label: "FAQ", description: "FAQ — question and answer format", icon: QuestionMarkCircleIcon },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditKnowledgeArticlePage() {
  const router = useRouter();
  const params = useParams();
  const articleId = params.id as string;

  // Article state
  const [article, setArticle] = useState<KnowledgeArticle | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<KnowledgeCategory>("FRANCHISE_FAQ");
  const [articleType, setArticleType] = useState<WikiArticleType>("ARTICLE");
  const [sopVersion, setSopVersion] = useState("");
  const [sopOwner, setSopOwner] = useState("");
  const [sopRequired, setSopRequired] = useState(false);
  const [content, setContent] = useState("");

  // Track changes
  const [isDirty, setIsDirty] = useState(false);
  const [contentChangedSincePublish, setContentChangedSincePublish] = useState(false);
  const savedContentRef = useRef<string>("");

  // Save status
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);

  // Action states
  const [publishLoading, setPublishLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // Validation
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ─── Load Article ─────────────────────────────────────────────────────────

  const fetchArticle = useCallback(async () => {
    try {
      setLoading(true);
      setLoadError(null);

      const res = await fetch(`/api/admin/knowledge-base/${articleId}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error("Article not found.");
        throw new Error("Failed to load article.");
      }

      const data = await res.json();
      const a: KnowledgeArticle = data.article;

      setArticle(a);
      setTitle(a.title);
      setCategory(a.category);
      setArticleType(a.articleType || "ARTICLE");
      setSopVersion(a.sopVersion || "");
      setSopOwner(a.sopOwner || "");
      setSopRequired(a.sopRequired || false);
      setContent(a.content);
      savedContentRef.current = a.content;
      setIsDirty(false);
      setContentChangedSincePublish(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to load article.";
      setLoadError(message);
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    fetchArticle();
  }, [fetchArticle]);

  // ─── Track dirty state ────────────────────────────────────────────────────

  useEffect(() => {
    if (!article) return;
    const hasChanges =
      title !== article.title ||
      category !== article.category ||
      articleType !== (article.articleType || "ARTICLE") ||
      sopVersion !== (article.sopVersion || "") ||
      sopOwner !== (article.sopOwner || "") ||
      sopRequired !== (article.sopRequired || false) ||
      content !== savedContentRef.current;
    setIsDirty(hasChanges);

    // Track if content changed since last publish (for re-publish notice)
    if (article.isPublic && content !== savedContentRef.current) {
      setContentChangedSincePublish(true);
    }
  }, [title, category, articleType, sopVersion, sopOwner, sopRequired, content, article]);

  // ─── Save ─────────────────────────────────────────────────────────────────

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required.";
    if (!content.trim() || content === "<p></p>") newErrors.content = "Content is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;

    setSaveStatus("saving");
    setSaveError(null);

    try {
      const res = await fetch(`/api/admin/knowledge-base/${articleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          content,
          category,
          scope: "ACADEMY",
          articleType,
          sopVersion: articleType === "SOP" ? sopVersion : undefined,
          sopOwner: articleType === "SOP" ? sopOwner : undefined,
          sopRequired: articleType === "SOP" ? sopRequired : undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to save article.");
      }

      const data = await res.json();
      setArticle(data.article);
      savedContentRef.current = content;
      setIsDirty(false);
      setSaveStatus("saved");

      // Reset save status after 3 seconds
      setTimeout(() => {
        setSaveStatus((prev) => (prev === "saved" ? "idle" : prev));
      }, 3000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to save.";
      setSaveError(message);
      setSaveStatus("error");
    }
  }

  // ─── Publish / Unpublish ──────────────────────────────────────────────────

  async function handlePublishToggle() {
    setPublishLoading(true);
    try {
      // Save first if there are unsaved changes
      if (isDirty) {
        const saveRes = await fetch(`/api/admin/knowledge-base/${articleId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content,
            category,
            scope: "ACADEMY",
            articleType,
            sopVersion: articleType === "SOP" ? sopVersion : undefined,
            sopOwner: articleType === "SOP" ? sopOwner : undefined,
            sopRequired: articleType === "SOP" ? sopRequired : undefined,
          }),
        });
        if (!saveRes.ok) throw new Error("Failed to save before publishing.");
        savedContentRef.current = content;
        setIsDirty(false);
      }

      const wasPublished = article?.isPublic;

      const res = await fetch(`/api/admin/knowledge-base/${articleId}/publish`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to toggle publish status.");

      // Refresh article data to get updated state
      await fetchArticle();
      setContentChangedSincePublish(false);

      // Show link suggestions after publishing (not unpublishing)
      if (!wasPublished) {
        setShowSuggestions(true);
      }
    } catch (err) {
      console.error("Publish toggle failed:", err);
      setSaveError(err instanceof Error ? err.message : "Publish action failed.");
      setSaveStatus("error");
    } finally {
      setPublishLoading(false);
    }
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async function handleDelete() {
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/admin/knowledge-base/${articleId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete article.");
      setShowDeleteModal(false);
      router.push("/admin/learning/knowledge-base");
    } catch (err) {
      console.error("Delete failed:", err);
      setShowDeleteModal(false);
    } finally {
      setDeleteLoading(false);
    }
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <ArrowPathIcon className="h-8 w-8 text-gray-400 animate-spin mx-auto mb-3" />
          <p className="text-gray-500">Loading article...</p>
        </div>
      </div>
    );
  }

  if (loadError || !article) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href="/admin/learning/knowledge-base"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-navy transition mb-4"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Franchise Wiki
        </Link>
        <div className="bg-white rounded-lg shadow p-12 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-red-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-700 mb-1">Unable to load article</h3>
          <p className="text-gray-500">{loadError || "Article not found."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/learning/knowledge-base"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-navy transition mb-3"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Franchise Wiki
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-brand-navy">Edit Article</h1>
            {article.isPublic ? (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                Published
              </span>
            ) : (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                Draft
              </span>
            )}
          </div>

          {/* Save Status */}
          <div className="flex items-center gap-2 text-sm">
            {saveStatus === "saving" && (
              <span className="flex items-center gap-1 text-gray-500">
                <ArrowPathIcon className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircleIcon className="h-4 w-4" />
                Saved
              </span>
            )}
            {saveStatus === "error" && (
              <span className="flex items-center gap-1 text-red-500">
                <ExclamationTriangleIcon className="h-4 w-4" />
                {saveError || "Error saving"}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Info Bar */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1.5">
            {article.isPublic ? (
              <EyeIcon className="h-4 w-4 text-green-500" />
            ) : (
              <EyeSlashIcon className="h-4 w-4 text-gray-400" />
            )}
            <span>{article.isPublic ? "Published" : "Draft"}</span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1.5">
            <span className="font-medium">{article._count.chunks}</span>
            <span>RAG chunk{article._count.chunks !== 1 ? "s" : ""}</span>
          </div>
          <span className="text-gray-300">|</span>
          <div className="flex items-center gap-1.5">
            <ClockIcon className="h-4 w-4 text-gray-400" />
            <span>Last updated {formatDate(article.updatedAt)}</span>
          </div>
          {article.authorName && (
            <>
              <span className="text-gray-300">|</span>
              <div className="flex items-center gap-1.5">
                {article.authorImage ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={article.authorImage} alt={article.authorName} className="w-5 h-5 rounded-full" />
                ) : (
                  <span className="w-5 h-5 rounded-full bg-brand-navy text-white text-[10px] font-bold flex items-center justify-center">
                    {article.authorName.charAt(0).toUpperCase()}
                  </span>
                )}
                <span>{article.authorName}</span>
              </div>
            </>
          )}
        </div>

        {/* Sharable Link */}
        {article.slug && (
          <div className="mt-3 flex items-center gap-2">
            <LinkIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
            <code className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded flex-1 min-w-0 truncate">
              /wiki/{article.slug}
            </code>
            <button
              onClick={() => {
                const fullUrl = `${window.location.origin}/wiki/${article.slug}`;
                navigator.clipboard.writeText(fullUrl);
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), 2000);
              }}
              className="inline-flex items-center gap-1 text-xs text-brand-navy hover:text-brand-purple transition flex-shrink-0"
            >
              <ClipboardDocumentIcon className="h-4 w-4" />
              {linkCopied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        )}

        {/* Re-publish notice */}
        {article.isPublic && contentChangedSincePublish && (
          <div className="mt-3 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <ExclamationTriangleIcon className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              Content has changed since last publish. Click <strong>Publish</strong> to update
              Earl&apos;s knowledge with the latest content.
            </p>
          </div>
        )}
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 space-y-6">
          {/* Title */}
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter article title..."
              className={`w-full border rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-brand-navy focus:border-brand-navy ${
                errors.title ? "border-red-300 bg-red-50" : "border-gray-300"
              }`}
            />
            {errors.title && <p className="mt-1 text-sm text-red-500">{errors.title}</p>}
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1">
              Category
            </label>
            <select
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value as KnowledgeCategory)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Article Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Article Type</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {ARTICLE_TYPES.map((t) => {
                const Icon = t.icon;
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setArticleType(t.value)}
                    className={`flex flex-col items-center text-center rounded-lg border-2 p-3 transition ${
                      articleType === t.value
                        ? "border-brand-navy bg-brand-navy/5"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <Icon className="h-6 w-6 mb-1.5 text-brand-navy" />
                    <span className="text-sm font-medium text-gray-900">{t.label}</span>
                    <p className="text-xs text-gray-500 mt-1">{t.description}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* SOP Fields (conditional) */}
          {articleType === "SOP" && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4 border border-gray-200">
              <h3 className="text-sm font-medium text-gray-700">SOP Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sopVersion" className="block text-sm text-gray-600 mb-1">
                    Version
                  </label>
                  <input
                    id="sopVersion"
                    type="text"
                    value={sopVersion}
                    onChange={(e) => setSopVersion(e.target.value)}
                    placeholder="1.0"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
                  />
                </div>
                <div>
                  <label htmlFor="sopOwner" className="block text-sm text-gray-600 mb-1">
                    Owner
                  </label>
                  <input
                    id="sopOwner"
                    type="text"
                    value={sopOwner}
                    onChange={(e) => setSopOwner(e.target.value)}
                    placeholder="Person responsible"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sopRequired}
                  onChange={(e) => setSopRequired(e.target.checked)}
                  className="rounded border-gray-300 text-brand-navy focus:ring-brand-navy"
                />
                <span className="text-sm text-gray-700">Required — franchisees must acknowledge this SOP</span>
              </label>
            </div>
          )}

          {/* Content Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content <span className="text-red-500">*</span>
            </label>
            <div
              className={`border rounded-lg overflow-hidden ${
                errors.content ? "border-red-300" : "border-gray-300"
              }`}
            >
              <TipTapEditor
                key={article.id}
                content={content}
                onChange={(html: string) => setContent(html)}
                placeholder="Write your article content..."
              />
            </div>
            {errors.content && <p className="mt-1 text-sm text-red-500">{errors.content}</p>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg flex flex-col sm:flex-row items-center justify-between gap-3">
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1 bg-red-500 text-white rounded-lg px-4 py-2 text-sm hover:bg-red-600 transition"
          >
            <TrashIcon className="h-4 w-4" />
            Delete
          </button>

          <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
            <button
              onClick={handleSave}
              disabled={!isDirty || saveStatus === "saving"}
              className="w-full sm:w-auto border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saveStatus === "saving" ? "Saving..." : "Save"}
            </button>
            <button
              onClick={handlePublishToggle}
              disabled={publishLoading}
              className={`w-full sm:w-auto inline-flex items-center justify-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition disabled:opacity-50 ${
                article.isPublic
                  ? "border border-gray-300 text-gray-700 hover:bg-gray-50"
                  : "bg-brand-navy text-white hover:bg-brand-purple"
              }`}
            >
              {publishLoading ? (
                <>
                  <ArrowPathIcon className="h-4 w-4 animate-spin" />
                  {article.isPublic ? "Unpublishing..." : "Publishing..."}
                </>
              ) : article.isPublic ? (
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
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Delete Article"
        message={`Are you sure you want to delete "${article.title}"? This will also remove all associated RAG chunks. This action cannot be undone.`}
        confirmLabel={deleteLoading ? "Deleting..." : "Delete"}
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />

      {/* Link Suggestions Panel (after publish) */}
      <LinkSuggestionsPanel
        articleId={articleId}
        isOpen={showSuggestions}
        onClose={() => setShowSuggestions(false)}
        onLinksApplied={() => fetchArticle()}
      />
    </div>
  );
}
