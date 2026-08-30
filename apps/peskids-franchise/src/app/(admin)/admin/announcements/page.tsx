"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { Card, CardContent } from "@/components/shared/Card";
import { formatDate } from "@/lib/utils";
import {
  MegaphoneIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  CheckCircleIcon,
  ArchiveBoxIcon,
  MapPinIcon,
  XMarkIcon,
  EyeIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";

// ─── Types ────────────────────────────────────────────────────────────────────

type AnnouncementCategory =
  | "GENERAL"
  | "POLICY"
  | "TRAINING"
  | "EVENT"
  | "SYSTEM"
  | "MARKETING";

type AnnouncementPriority = "LOW" | "NORMAL" | "HIGH" | "URGENT";

type AnnouncementStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

interface Announcement {
  id: string;
  title: string;
  content: string;
  category: AnnouncementCategory;
  priority: AnnouncementPriority;
  status: AnnouncementStatus;
  publishedAt: string | null;
  expiresAt: string | null;
  createdBy: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    reads: number;
  };
}

// ─── Constants ────────────────────────────────────────────────────────────────

const categoryConfig: Record<
  AnnouncementCategory,
  { label: string; bg: string; text: string; border: string }
> = {
  GENERAL: {
    label: "General",
    bg: "bg-gray-100",
    text: "text-gray-700",
    border: "border-gray-200",
  },
  POLICY: {
    label: "Policy",
    bg: "bg-indigo-100",
    text: "text-indigo-700",
    border: "border-indigo-200",
  },
  TRAINING: {
    label: "Training",
    bg: "bg-purple-100",
    text: "text-purple-700",
    border: "border-purple-200",
  },
  EVENT: {
    label: "Event",
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  SYSTEM: {
    label: "System",
    bg: "bg-cyan-100",
    text: "text-cyan-700",
    border: "border-cyan-200",
  },
  MARKETING: {
    label: "Marketing",
    bg: "bg-pink-100",
    text: "text-pink-700",
    border: "border-pink-200",
  },
};

const priorityConfig: Record<
  AnnouncementPriority,
  { label: string; color: string; dot: string }
> = {
  LOW: { label: "Low", color: "text-gray-500", dot: "bg-gray-400" },
  NORMAL: { label: "Normal", color: "text-blue-600", dot: "bg-blue-500" },
  HIGH: { label: "High", color: "text-orange-600", dot: "bg-orange-500" },
  URGENT: { label: "Urgent", color: "text-red-600", dot: "bg-red-500" },
};

const statusConfig: Record<
  AnnouncementStatus,
  { label: string; bg: string; text: string }
> = {
  DRAFT: { label: "Draft", bg: "bg-gray-100", text: "text-gray-600" },
  PUBLISHED: {
    label: "Published",
    bg: "bg-emerald-100",
    text: "text-emerald-700",
  },
  ARCHIVED: {
    label: "Archived",
    bg: "bg-slate-100",
    text: "text-slate-600",
  },
};

const CATEGORIES: AnnouncementCategory[] = [
  "GENERAL",
  "POLICY",
  "TRAINING",
  "EVENT",
  "SYSTEM",
  "MARKETING",
];

const PRIORITIES: AnnouncementPriority[] = ["LOW", "NORMAL", "HIGH", "URGENT"];

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [totalFranchisees, setTotalFranchisees] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | AnnouncementStatus>(
    "all"
  );
  const [categoryFilter, setCategoryFilter] = useState<
    "all" | AnnouncementCategory
  >("all");

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] =
    useState<Announcement | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<Announcement | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] =
    useState<AnnouncementCategory>("GENERAL");
  const [formPriority, setFormPriority] =
    useState<AnnouncementPriority>("NORMAL");
  const [formIsPinned, setFormIsPinned] = useState(false);
  const [formExpiresAt, setFormExpiresAt] = useState("");

  // ─── Data Fetching ──────────────────────────────────────────────────────

  const fetchAnnouncements = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/announcements");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setAnnouncements(data.announcements || []);
      setTotalFranchisees(data.totalFranchisees || 0);
    } catch (error) {
      console.error("Failed to fetch announcements:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();
  }, [fetchAnnouncements]);

  // ─── Filtering ──────────────────────────────────────────────────────────

  const now = new Date();

  const filtered = announcements.filter((a) => {
    if (statusFilter !== "all" && a.status !== statusFilter) return false;
    if (categoryFilter !== "all" && a.category !== categoryFilter) return false;
    return true;
  });

  const publishedCount = announcements.filter(
    (a) => a.status === "PUBLISHED"
  ).length;
  const draftCount = announcements.filter((a) => a.status === "DRAFT").length;
  const pinnedCount = announcements.filter((a) => a.isPinned).length;
  const expiredCount = announcements.filter(
    (a) => a.expiresAt && new Date(a.expiresAt) < now
  ).length;

  // ─── Form Helpers ───────────────────────────────────────────────────────

  const resetForm = () => {
    setFormTitle("");
    setFormContent("");
    setFormCategory("GENERAL");
    setFormPriority("NORMAL");
    setFormIsPinned(false);
    setFormExpiresAt("");
    setErrorMessage("");
  };

  const openCreate = () => {
    resetForm();
    setEditingAnnouncement(null);
    setShowCreateModal(true);
  };

  const openEdit = (a: Announcement) => {
    setFormTitle(a.title);
    setFormContent(a.content);
    setFormCategory(a.category);
    setFormPriority(a.priority);
    setFormIsPinned(a.isPinned);
    setFormExpiresAt(
      a.expiresAt ? new Date(a.expiresAt).toISOString().slice(0, 16) : ""
    );
    setErrorMessage("");
    setEditingAnnouncement(a);
    setShowCreateModal(true);
  };

  const closeModal = () => {
    setShowCreateModal(false);
    setEditingAnnouncement(null);
    resetForm();
  };

  // ─── CRUD Operations ───────────────────────────────────────────────────

  const handleSave = async () => {
    if (!formTitle.trim() || !formContent.trim()) {
      setErrorMessage("Title and content are required.");
      return;
    }
    setSaving(true);
    setErrorMessage("");

    try {
      if (editingAnnouncement) {
        const res = await fetch(
          `/api/admin/announcements/${editingAnnouncement.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              title: formTitle.trim(),
              content: formContent.trim(),
              category: formCategory,
              priority: formPriority,
              isPinned: formIsPinned,
              expiresAt: formExpiresAt || null,
            }),
          }
        );
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update");
        }
      } else {
        const res = await fetch("/api/admin/announcements", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle.trim(),
            content: formContent.trim(),
            category: formCategory,
            priority: formPriority,
            isPinned: formIsPinned,
            expiresAt: formExpiresAt || null,
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to create");
        }
      }
      closeModal();
      fetchAnnouncements();
    } catch (error: any) {
      setErrorMessage(error.message || "An error occurred");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (a: Announcement) => {
    try {
      const res = await fetch(`/api/admin/announcements/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PUBLISHED" }),
      });
      if (!res.ok) throw new Error("Failed to publish");
      fetchAnnouncements();
    } catch (error) {
      console.error("Failed to publish:", error);
    }
  };

  const handleArchive = async (a: Announcement) => {
    try {
      const res = await fetch(`/api/admin/announcements/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });
      if (!res.ok) throw new Error("Failed to archive");
      fetchAnnouncements();
    } catch (error) {
      console.error("Failed to archive:", error);
    }
  };

  const handleTogglePin = async (a: Announcement) => {
    try {
      const res = await fetch(`/api/admin/announcements/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !a.isPinned }),
      });
      if (!res.ok) throw new Error("Failed to toggle pin");
      fetchAnnouncements();
    } catch (error) {
      console.error("Failed to toggle pin:", error);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    try {
      const res = await fetch(`/api/admin/announcements/${deleteConfirm.id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      setDeleteConfirm(null);
      fetchAnnouncements();
    } catch (error) {
      console.error("Failed to delete:", error);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <WideContainer className="py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <MegaphoneIcon className="h-7 w-7 text-brand-navy" />
            Announcements
          </h1>
          <p className="text-gray-500 mt-1">
            Create and manage announcements for your franchise network
          </p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-navy text-white font-medium rounded-xl hover:bg-brand-navy/90 transition-colors shadow-sm"
        >
          <PlusIcon className="h-5 w-5" />
          New Announcement
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-emerald-300 bg-emerald-50">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircleIcon className="h-5 w-5 text-emerald-600" />
              <span className="text-sm text-gray-500">Published</span>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {publishedCount}
            </p>
          </CardContent>
        </Card>
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <DocumentTextIcon className="h-5 w-5 text-amber-600" />
              <span className="text-sm text-gray-500">Drafts</span>
            </div>
            <p className="text-2xl font-bold text-amber-600">{draftCount}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-300 bg-blue-50">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <MapPinIcon className="h-5 w-5 text-blue-600" />
              <span className="text-sm text-gray-500">Pinned</span>
            </div>
            <p className="text-2xl font-bold text-blue-600">{pinnedCount}</p>
          </CardContent>
        </Card>
        <Card className="border-red-300 bg-red-50">
          <CardContent className="pt-5">
            <div className="flex items-center gap-2 mb-2">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-600" />
              <span className="text-sm text-gray-500">Expired</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{expiredCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-5 pb-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex items-center gap-2 text-gray-500">
              <FunnelIcon className="h-4 w-4" />
              <span className="text-sm font-medium">Filters</span>
            </div>
            <div className="flex flex-wrap gap-3">
              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(
                    e.target.value as "all" | AnnouncementStatus
                  )
                }
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy"
              >
                <option value="all">All Statuses</option>
                <option value="PUBLISHED">Published</option>
                <option value="DRAFT">Drafts</option>
                <option value="ARCHIVED">Archived</option>
              </select>

              {/* Category Filter */}
              <select
                value={categoryFilter}
                onChange={(e) =>
                  setCategoryFilter(
                    e.target.value as "all" | AnnouncementCategory
                  )
                }
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy"
              >
                <option value="all">All Categories</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {categoryConfig[cat].label}
                  </option>
                ))}
              </select>
            </div>
            <span className="text-sm text-gray-400 ml-auto">
              {filtered.length} announcement
              {filtered.length !== 1 ? "s" : ""}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Announcements List */}
      {loading ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-gray-400">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-brand-navy mb-3" />
              <p className="text-sm">Loading announcements...</p>
            </div>
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <div className="flex flex-col items-center justify-center text-gray-400">
              <MegaphoneIcon className="h-12 w-12 mb-3" />
              <p className="text-lg font-medium text-gray-500">
                No announcements found
              </p>
              <p className="text-sm mt-1">
                {statusFilter !== "all" || categoryFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Create your first announcement to get started"}
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const cat = categoryConfig[a.category];
            const pri = priorityConfig[a.priority];
            const stat = statusConfig[a.status];
            const isExpired =
              a.expiresAt && new Date(a.expiresAt) < now;

            return (
              <Card
                key={a.id}
                className={`hover:shadow-xl transition-shadow ${
                  a.isPinned ? "ring-2 ring-blue-200" : ""
                }`}
              >
                <CardContent className="py-5">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Left: Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        {/* Priority dot */}
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-full ${pri.dot}`}
                          title={`Priority: ${pri.label}`}
                        />
                        {/* Title */}
                        <h3 className="font-semibold text-gray-900 truncate">
                          {a.title}
                        </h3>
                        {/* Pinned indicator */}
                        {a.isPinned && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                            <MapPinIcon className="h-3 w-3" />
                            Pinned
                          </span>
                        )}
                      </div>

                      {/* Content preview */}
                      <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                        {a.content}
                      </p>

                      {/* Meta row */}
                      <div className="flex items-center gap-3 flex-wrap text-xs">
                        {/* Category badge */}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium ${cat.bg} ${cat.text}`}
                        >
                          {cat.label}
                        </span>
                        {/* Status badge */}
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full font-medium ${stat.bg} ${stat.text}`}
                        >
                          {stat.label}
                        </span>
                        {/* Expired badge */}
                        {isExpired && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-medium bg-red-100 text-red-700">
                            <ClockIcon className="h-3 w-3" />
                            Expired
                          </span>
                        )}
                        {/* Read count */}
                        <span className="inline-flex items-center gap-1 text-gray-400">
                          <EyeIcon className="h-3.5 w-3.5" />
                          {a._count.reads}/{totalFranchisees} read
                        </span>
                        {/* Created date */}
                        <span className="text-gray-400">
                          Created {formatDate(a.createdAt)}
                        </span>
                        {/* Published date */}
                        {a.publishedAt && (
                          <span className="text-gray-400">
                            Published {formatDate(a.publishedAt)}
                          </span>
                        )}
                        {/* Expires date */}
                        {a.expiresAt && !isExpired && (
                          <span className="text-gray-400">
                            Expires {formatDate(a.expiresAt)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-2 lg:flex-shrink-0">
                      {/* Edit */}
                      <button
                        onClick={() => openEdit(a)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <PencilSquareIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">Edit</span>
                      </button>

                      {/* Publish (only for drafts) */}
                      {a.status === "DRAFT" && (
                        <button
                          onClick={() => handlePublish(a)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Publish"
                        >
                          <CheckCircleIcon className="h-4 w-4" />
                          <span className="hidden sm:inline">Publish</span>
                        </button>
                      )}

                      {/* Archive (for published) */}
                      {a.status === "PUBLISHED" && (
                        <button
                          onClick={() => handleArchive(a)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Archive"
                        >
                          <ArchiveBoxIcon className="h-4 w-4" />
                          <span className="hidden sm:inline">Archive</span>
                        </button>
                      )}

                      {/* Pin/Unpin */}
                      <button
                        onClick={() => handleTogglePin(a)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-colors ${
                          a.isPinned
                            ? "text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                        }`}
                        title={a.isPinned ? "Unpin" : "Pin"}
                      >
                        <MapPinIcon className="h-4 w-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => setDeleteConfirm(a)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ─── Create / Edit Modal ──────────────────────────────────────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={closeModal}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingAnnouncement
                  ? "Edit Announcement"
                  : "New Announcement"}
              </h2>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-5 space-y-5">
              {errorMessage && (
                <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
                  {errorMessage}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Announcement title..."
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors"
                />
              </div>

              {/* Content */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  placeholder="Write your announcement content..."
                  rows={6}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors resize-y"
                />
              </div>

              {/* Category + Priority Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) =>
                      setFormCategory(e.target.value as AnnouncementCategory)
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {categoryConfig[cat].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Priority
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) =>
                      setFormPriority(e.target.value as AnnouncementPriority)
                    }
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors"
                  >
                    {PRIORITIES.map((pri) => (
                      <option key={pri} value={pri}>
                        {priorityConfig[pri].label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Expiry + Pin Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Expires At{" "}
                    <span className="text-gray-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    type="datetime-local"
                    value={formExpiresAt}
                    onChange={(e) => setFormExpiresAt(e.target.value)}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy transition-colors"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={formIsPinned}
                        onChange={(e) => setFormIsPinned(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-10 h-6 bg-gray-200 rounded-full peer-checked:bg-blue-500 transition-colors" />
                      <div className="absolute left-0.5 top-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform peer-checked:translate-x-4" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                      Pin to top
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-brand-navy hover:bg-brand-navy/90 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                    Saving...
                  </>
                ) : editingAnnouncement ? (
                  "Save Changes"
                ) : (
                  "Create Draft"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ────────────────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={() => setDeleteConfirm(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-full bg-red-100">
                  <TrashIcon className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Delete Announcement
                </h3>
              </div>
              <p className="text-sm text-gray-600 mb-1">
                Are you sure you want to delete this announcement?
              </p>
              <p className="text-sm font-medium text-gray-900 mb-4">
                &ldquo;{deleteConfirm.title}&rdquo;
              </p>
              <p className="text-xs text-gray-400">
                This action cannot be undone. All read tracking data will also
                be removed.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="inline-flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-xl transition-colors shadow-sm"
              >
                <TrashIcon className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </WideContainer>
  );
}
