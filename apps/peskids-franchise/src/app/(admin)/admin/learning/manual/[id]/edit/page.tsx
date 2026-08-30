"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  BookOpenIcon,
  EyeIcon,
  PencilSquareIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  XMarkIcon,
  ClockIcon,
} from "@heroicons/react/24/outline";
import { formatDateTime } from "@/lib/utils";
import { ManualEditor } from "@/components/admin/manual/ManualEditor";

interface ManualSection {
  id: string;
  title: string;
  icon: string | null;
}

interface VersionHistory {
  id: string;
  versionNumber: number;
  changeType: string;
  changeSummary: string | null;
  createdBy: string | null;
  createdAt: string;
}

interface ManualPageData {
  id: string;
  title: string;
  excerpt: string | null;
  content: string;
  status: string;
  version: number;
  requiresAcknowledgment: boolean;
  sectionId: string | null;
  section: {
    id: string;
    title: string;
    icon: string | null;
  } | null;
  versionHistory: VersionHistory[];
  createdAt: string;
  updatedAt: string;
}

export default function EditManualPage() {
  const params = useParams();
  const router = useRouter();
  const pageId = params.id as string;

  const [pageData, setPageData] = useState<ManualPageData | null>(null);
  const [sections, setSections] = useState<ManualSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);

  // Form state
  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    sectionId: "",
    requiresAcknowledgment: false,
  });

  // Track original content for change detection
  const [originalContent, setOriginalContent] = useState("");

  // Change details for content changes
  const [changeType, setChangeType] = useState<"MAJOR" | "MINOR">("MINOR");
  const [changeSummary, setChangeSummary] = useState("");

  // Delete confirmation modal
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [pageRes, sectionsRes] = await Promise.all([
        fetch(`/api/admin/operations/manual/pages/${pageId}`),
        fetch("/api/admin/operations/manual/sections"),
      ]);

      if (!pageRes.ok) {
        router.push("/admin/learning/manual");
        return;
      }

      const pageJson = await pageRes.json();
      const sectionsJson = await sectionsRes.json();

      const page = pageJson.page;
      setPageData(page);
      setSections(sectionsJson.sections || []);

      setForm({
        title: page.title || "",
        excerpt: page.excerpt || "",
        content: page.content || "",
        sectionId: page.sectionId || "",
        requiresAcknowledgment: page.requiresAcknowledgment || false,
      });
      setOriginalContent(page.content || "");
    } catch (error) {
      console.error("Failed to fetch page:", error);
    } finally {
      setLoading(false);
    }
  }, [pageId, router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const contentChanged = form.content !== originalContent;

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: form.title,
        excerpt: form.excerpt || null,
        content: form.content,
        sectionId: form.sectionId || null,
        requiresAcknowledgment: form.requiresAcknowledgment,
      };

      if (contentChanged) {
        body.changeType = changeType;
        body.changeSummary = changeSummary || null;
      }

      const res = await fetch(
        `/api/admin/operations/manual/pages/${pageId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );

      if (res.ok) {
        setOriginalContent(form.content);
        setChangeSummary("");
        fetchData();
      }
    } catch (error) {
      console.error("Failed to save page:", error);
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/operations/manual/pages/${pageId}/publish`,
        { method: "POST" }
      );
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to publish page:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleUnpublish = async () => {
    setSaving(true);
    try {
      const res = await fetch(
        `/api/admin/operations/manual/pages/${pageId}/publish`,
        { method: "DELETE" }
      );
      if (res.ok) {
        fetchData();
      }
    } catch (error) {
      console.error("Failed to unpublish page:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/operations/manual/pages/${pageId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        router.push("/admin/learning/manual");
      }
    } catch (error) {
      console.error("Failed to delete page:", error);
    } finally {
      setDeleting(false);
    }
  };

  const changeTypeBadge = (type: string) => {
    switch (type) {
      case "MAJOR":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            Major
          </span>
        );
      case "MINOR":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
            Minor
          </span>
        );
      case "INITIAL":
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            Initial
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {type}
          </span>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
      </div>
    );
  }

  if (!pageData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Page not found.</p>
        <Link
          href="/admin/learning/manual"
          className="text-indigo-600 hover:underline text-sm mt-2 inline-block"
        >
          Back to Manual
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Back Link */}
      <Link
        href="/admin/learning/manual"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-brand-navy transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to Operations Manual
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <BookOpenIcon className="h-8 w-8 text-brand-navy" />
          <div>
            <h1 className="text-2xl font-bold text-brand-navy">Edit Page</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-sm text-gray-500">
                v{pageData.version}
              </span>
              <span className="text-gray-300">|</span>
              {pageData.status === "PUBLISHED" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                  <EyeIcon className="h-3 w-3" />
                  Published
                </span>
              ) : pageData.status === "ARCHIVED" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  Archived
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                  <PencilSquareIcon className="h-3 w-3" />
                  Draft
                </span>
              )}
            </div>
          </div>
        </div>
        <button
          onClick={() => setShowDeleteModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
        >
          <TrashIcon className="h-4 w-4" />
          Delete
        </button>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="p-6 space-y-5">
          {/* Section */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Section
            </label>
            <select
              value={form.sectionId}
              onChange={(e) =>
                setForm({ ...form, sectionId: e.target.value })
              }
              className="w-full sm:w-80 rounded-lg border-gray-300 text-sm py-2 px-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="">No Section (Uncategorized)</option>
              {sections.map((section) => (
                <option key={section.id} value={section.id}>
                  {section.icon ? `${section.icon} ` : ""}
                  {section.title}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Page title"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            />
          </div>

          {/* Excerpt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Excerpt
            </label>
            <textarea
              value={form.excerpt}
              onChange={(e) => setForm({ ...form, excerpt: e.target.value })}
              placeholder="Brief summary of this page..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm resize-none"
            />
          </div>

          {/* Content Editor */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Content
            </label>
            <ManualEditor
              content={form.content}
              onChange={(html) => setForm({ ...form, content: html })}
              placeholder="Start writing the manual page content..."
            />
          </div>

          {/* Change Details - only show when content has changed */}
          {contentChanged && (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-amber-800">
                Content has been modified. Please describe the change:
              </p>
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="changeType"
                    value="MAJOR"
                    checked={changeType === "MAJOR"}
                    onChange={() => setChangeType("MAJOR")}
                    className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 font-medium">
                    Major Revision
                  </span>
                  <span className="text-xs text-gray-400">
                    (requires re-acknowledgment)
                  </span>
                </label>
                <label className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="changeType"
                    value="MINOR"
                    checked={changeType === "MINOR"}
                    onChange={() => setChangeType("MINOR")}
                    className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-700 font-medium">
                    Minor Edit
                  </span>
                  <span className="text-xs text-gray-400">
                    (typos, formatting)
                  </span>
                </label>
              </div>
              <input
                type="text"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                placeholder="Brief summary of changes..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              />
            </div>
          )}

          {/* Requires Acknowledgment */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="requiresAck"
              checked={form.requiresAcknowledgment}
              onChange={(e) =>
                setForm({
                  ...form,
                  requiresAcknowledgment: e.target.checked,
                })
              }
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label
              htmlFor="requiresAck"
              className="text-sm font-medium text-gray-700"
            >
              Requires Acknowledgment
            </label>
            <span className="text-xs text-gray-400">
              Franchisees must acknowledge they have read this page
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50">
          <div>
            {pageData.status === "PUBLISHED" ? (
              <button
                onClick={handleUnpublish}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50"
              >
                Unpublish
              </button>
            ) : (
              <button
                onClick={handlePublish}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
              >
                Publish
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/learning/manual"
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </Link>
            <button
              onClick={handleSave}
              disabled={!form.title.trim() || saving}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>

      {/* Version History */}
      {pageData.versionHistory && pageData.versionHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <button
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ClockIcon className="h-5 w-5 text-gray-400" />
              <span className="text-sm font-semibold text-gray-900">
                Version History
              </span>
              <span className="text-xs text-gray-400">
                ({pageData.versionHistory.length} version
                {pageData.versionHistory.length !== 1 ? "s" : ""})
              </span>
            </div>
            {showVersionHistory ? (
              <ChevronUpIcon className="h-5 w-5 text-gray-400" />
            ) : (
              <ChevronDownIcon className="h-5 w-5 text-gray-400" />
            )}
          </button>

          {showVersionHistory && (
            <div className="border-t border-gray-100">
              <div className="divide-y divide-gray-100">
                {pageData.versionHistory.map((version) => (
                  <div
                    key={version.id}
                    className="px-6 py-3 flex items-center gap-4"
                  >
                    <span className="text-sm font-mono text-gray-600 w-10 flex-shrink-0">
                      v{version.versionNumber}
                    </span>
                    <div className="flex-shrink-0">
                      {changeTypeBadge(version.changeType)}
                    </div>
                    <p className="text-sm text-gray-600 flex-1 truncate">
                      {version.changeSummary || "No summary provided"}
                    </p>
                    <div className="text-right flex-shrink-0">
                      <p className="text-xs text-gray-500">
                        {version.createdBy || "System"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {formatDateTime(version.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Page
              </h3>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-600">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-gray-900">
                  &ldquo;{pageData.title}&rdquo;
                </span>
                ? This action cannot be undone and will remove all version
                history and acknowledgment records.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Delete Page"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
