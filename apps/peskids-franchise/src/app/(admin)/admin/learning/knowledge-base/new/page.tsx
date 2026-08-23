"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TipTapEditor } from "@/components/shared/TipTapEditor";
import {
  ArrowLeftIcon,
  DocumentTextIcon,
  BookOpenIcon,
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewKnowledgeArticlePage() {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<KnowledgeCategory>("FRANCHISE_FAQ");
  const [articleType, setArticleType] = useState<WikiArticleType>("ARTICLE");
  const [sopVersion, setSopVersion] = useState("");
  const [sopOwner, setSopOwner] = useState("");
  const [sopRequired, setSopRequired] = useState(false);
  const [content, setContent] = useState("");

  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!title.trim()) newErrors.title = "Title is required.";
    if (!content.trim() || content === "<p></p>") newErrors.content = "Content is required.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSave(publish: boolean) {
    if (!validate()) return;

    setSaving(true);
    setErrors({});

    try {
      // Create the article
      const createRes = await fetch("/api/admin/knowledge-base", {
        method: "POST",
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

      if (!createRes.ok) {
        const errData = await createRes.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to create article");
      }

      const { article } = await createRes.json();

      if (publish) {
        // Publish the article (generates RAG chunks)
        const pubRes = await fetch(`/api/admin/knowledge-base/${article.id}/publish`, {
          method: "POST",
        });
        if (!pubRes.ok) {
          console.error("Article created but failed to publish");
        }
        router.push("/admin/learning/knowledge-base");
      } else {
        // Redirect to edit page for drafts
        router.push(`/admin/learning/knowledge-base/${article.id}/edit`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setErrors({ form: message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/admin/learning/knowledge-base"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-navy transition mb-3"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Franchise Wiki
        </Link>
        <div className="flex items-center gap-3">
          <DocumentTextIcon className="h-8 w-8 text-brand-navy" />
          <h1 className="text-2xl font-bold text-brand-navy">New Article</h1>
        </div>
      </div>

      {/* Form Error */}
      {errors.form && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-700">{errors.form}</p>
        </div>
      )}

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
                content={content}
                onChange={(html: string) => setContent(html)}
                placeholder="Write your article content..."
              />
            </div>
            {errors.content && <p className="mt-1 text-sm text-red-500">{errors.content}</p>}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="border-t border-gray-200 px-6 py-4 bg-gray-50 rounded-b-lg flex flex-col sm:flex-row items-center justify-end gap-3">
          <Link
            href="/admin/learning/knowledge-base"
            className="w-full sm:w-auto text-center border border-gray-300 rounded-lg px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="w-full sm:w-auto border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Draft"}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className="w-full sm:w-auto bg-brand-navy text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-brand-purple transition disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save & Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
