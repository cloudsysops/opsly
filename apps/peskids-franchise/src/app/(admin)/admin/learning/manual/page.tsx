"use client";

export const dynamic = "force-dynamic";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  BookOpenIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  EyeIcon,
  ArchiveBoxIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { formatDate } from "@/lib/utils";

interface ManualSection {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  _count: { pages: number };
}

interface ManualPage {
  id: string;
  title: string;
  excerpt: string | null;
  status: string;
  currentVersion: number;
  requiresAcknowledgment: boolean;
  section: {
    id: string;
    title: string;
    icon: string | null;
  } | null;
  acknowledgmentCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function ManualPagesListPage() {
  const [pages, setPages] = useState<ManualPage[]>([]);
  const [sections, setSections] = useState<ManualSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Section creation modal
  const [showSectionModal, setShowSectionModal] = useState(false);
  const [sectionForm, setSectionForm] = useState({
    title: "",
    description: "",
    icon: "",
  });
  const [savingSection, setSavingSection] = useState(false);

  // Delete confirmation modal
  const [deleteTarget, setDeleteTarget] = useState<ManualPage | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (sectionFilter) params.set("sectionId", sectionFilter);
      if (statusFilter) params.set("status", statusFilter);

      const [pagesRes, sectionsRes] = await Promise.all([
        fetch(`/api/admin/operations/manual/pages?${params}`),
        fetch("/api/admin/operations/manual/sections"),
      ]);

      const pagesData = await pagesRes.json();
      const sectionsData = await sectionsRes.json();

      setPages(pagesData.pages || []);
      setSections(sectionsData.sections || []);
    } catch (error) {
      console.error("Failed to fetch manual data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [searchQuery, sectionFilter, statusFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateSection = async () => {
    if (!sectionForm.title.trim()) return;
    setSavingSection(true);
    try {
      const res = await fetch("/api/admin/operations/manual/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(sectionForm),
      });
      if (res.ok) {
        setShowSectionModal(false);
        setSectionForm({ title: "", description: "", icon: "" });
        fetchData();
      }
    } catch (error) {
      console.error("Failed to create section:", error);
    } finally {
      setSavingSection(false);
    }
  };

  const handleDeletePage = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `/api/admin/operations/manual/pages/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setDeleteTarget(null);
        fetchData();
      }
    } catch (error) {
      console.error("Failed to delete page:", error);
    } finally {
      setDeleting(false);
    }
  };

  // Stats calculations
  const totalPages = pages.length;
  const publishedPages = pages.filter((p) => p.status === "PUBLISHED").length;
  const draftPages = pages.filter((p) => p.status === "DRAFT").length;
  const ackRequiredPages = pages.filter((p) => p.requiresAcknowledgment).length;

  const statusBadge = (status: string) => {
    switch (status) {
      case "PUBLISHED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
            <EyeIcon className="h-3 w-3" />
            Published
          </span>
        );
      case "DRAFT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
            <PencilSquareIcon className="h-3 w-3" />
            Draft
          </span>
        );
      case "ARCHIVED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            <ArchiveBoxIcon className="h-3 w-3" />
            Archived
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
            {status}
          </span>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
      </div>
    );
  }

  return (
    <WideContainer className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <BookOpenIcon className="h-8 w-8 text-brand-navy" />
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">
              Operations Manual
            </h1>
            <p className="mt-1 text-sm text-gray-600">
              Manage franchise operations documentation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSectionModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-slate-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
          >
            <PlusIcon className="h-4 w-4" />
            New Section
          </button>
          <Link
            href="/admin/learning/manual/new"
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <PlusIcon className="h-4 w-4" />
            New Page
          </Link>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <DocumentTextIcon className="h-4 w-4" />
            Total Pages
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalPages}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <EyeIcon className="h-4 w-4" />
            Published
          </div>
          <p className="text-2xl font-bold text-green-600">{publishedPages}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <PencilSquareIcon className="h-4 w-4" />
            Drafts
          </div>
          <p className="text-2xl font-bold text-amber-600">{draftPages}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <CheckCircleIcon className="h-4 w-4" />
            Require Acknowledgment
          </div>
          <p className="text-2xl font-bold text-indigo-600">
            {ackRequiredPages}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 sm:max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search pages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
          />
        </div>
        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className="rounded-lg border-gray-300 text-sm py-2 pl-3 pr-8 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All Sections</option>
          {sections.map((section) => (
            <option key={section.id} value={section.id}>
              {section.icon ? `${section.icon} ` : ""}
              {section.title}
            </option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border-gray-300 text-sm py-2 pl-3 pr-8 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="">All Statuses</option>
          <option value="PUBLISHED">Published</option>
          <option value="DRAFT">Draft</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Pages Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Title
                </th>
                <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Section
                </th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Status
                </th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Ack Required
                </th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Version
                </th>
                <th className="text-center text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Ack Count
                </th>
                <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider px-6 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center">
                    <BookOpenIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg font-medium">
                      No manual pages yet
                    </p>
                    <p className="text-gray-400 text-sm mt-1">
                      Create your first operations manual page to get started.
                    </p>
                    <Link
                      href="/admin/learning/manual/new"
                      className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                    >
                      <PlusIcon className="h-4 w-4" />
                      Create First Page
                    </Link>
                  </td>
                </tr>
              ) : (
                pages.map((page) => (
                  <tr key={page.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link
                        href={`/admin/learning/manual/${page.id}/edit`}
                        className="font-medium text-brand-navy hover:text-indigo-600 transition-colors"
                      >
                        {page.title}
                      </Link>
                      {page.excerpt && (
                        <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">
                          {page.excerpt}
                        </p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {page.section ? (
                        <span className="inline-flex items-center gap-1.5 text-sm text-gray-700">
                          {page.section.icon && (
                            <span className="text-base">
                              {page.section.icon}
                            </span>
                          )}
                          {page.section.title}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">
                          Uncategorized
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {statusBadge(page.status)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {page.requiresAcknowledgment ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500 mx-auto" />
                      ) : (
                        <span className="text-gray-300 text-lg">&mdash;</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-600 font-mono">
                        v{page.currentVersion}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="text-sm text-gray-600">
                        {page.acknowledgmentCount}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          href={`/admin/learning/manual/${page.id}/edit`}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                          title="Edit"
                        >
                          <PencilSquareIcon className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => setDeleteTarget(page)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section Creation Modal */}
      {showSectionModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                New Section
              </h3>
              <button
                onClick={() => setShowSectionModal(false)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={sectionForm.title}
                  onChange={(e) =>
                    setSectionForm({ ...sectionForm, title: e.target.value })
                  }
                  placeholder="e.g., Getting Started"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={sectionForm.description}
                  onChange={(e) =>
                    setSectionForm({
                      ...sectionForm,
                      description: e.target.value,
                    })
                  }
                  placeholder="Brief description of this section"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Icon (emoji)
                </label>
                <input
                  type="text"
                  value={sectionForm.icon}
                  onChange={(e) =>
                    setSectionForm({ ...sectionForm, icon: e.target.value })
                  }
                  placeholder="e.g., \uD83D\uDCD6"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                  maxLength={4}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowSectionModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateSection}
                disabled={!sectionForm.title.trim() || savingSection}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingSection ? "Creating..." : "Create Section"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900">
                Delete Page
              </h3>
              <button
                onClick={() => setDeleteTarget(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-gray-600">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-gray-900">
                  &ldquo;{deleteTarget.title}&rdquo;
                </span>
                ? This action cannot be undone and will remove all version
                history and acknowledgment records.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePage}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleting ? "Deleting..." : "Delete Page"}
              </button>
            </div>
          </div>
        </div>
      )}
    </WideContainer>
  );
}
