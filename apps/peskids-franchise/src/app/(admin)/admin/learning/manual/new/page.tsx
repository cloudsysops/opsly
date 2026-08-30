"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeftIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import { ManualEditor } from "@/components/admin/manual/ManualEditor";

interface ManualSection {
  id: string;
  title: string;
  icon: string | null;
}

export default function NewManualPage() {
  const router = useRouter();
  const [sections, setSections] = useState<ManualSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    title: "",
    excerpt: "",
    content: "",
    sectionId: "",
    requiresAcknowledgment: false,
  });

  useEffect(() => {
    fetchSections();
  }, []);

  const fetchSections = async () => {
    try {
      const res = await fetch("/api/admin/operations/manual/sections");
      const data = await res.json();
      setSections(data.sections || []);
    } catch (error) {
      console.error("Failed to fetch sections:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (publish: boolean) => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/operations/manual/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          excerpt: form.excerpt || null,
          content: form.content,
          sectionId: form.sectionId || null,
          requiresAcknowledgment: form.requiresAcknowledgment,
        }),
      });

      if (!res.ok) {
        console.error("Failed to create page");
        setSaving(false);
        return;
      }

      const data = await res.json();
      const pageId = data.page?.id;

      if (publish && pageId) {
        await fetch(`/api/admin/operations/manual/pages/${pageId}/publish`, {
          method: "POST",
        });
      }

      if (pageId) {
        router.push(`/admin/learning/manual/${pageId}/edit`);
      } else {
        router.push("/admin/learning/manual");
      }
    } catch (error) {
      console.error("Failed to save page:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
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
      <div className="flex items-center gap-3">
        <BookOpenIcon className="h-8 w-8 text-brand-navy" />
        <div>
          <h1 className="text-2xl font-bold text-brand-navy">
            Create New Page
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Add a new page to the operations manual
          </p>
        </div>
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <Link
            href="/admin/learning/manual"
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Cancel
          </Link>
          <button
            onClick={() => handleSave(false)}
            disabled={!form.title.trim() || saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save as Draft"}
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={!form.title.trim() || saving}
            className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save & Publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
