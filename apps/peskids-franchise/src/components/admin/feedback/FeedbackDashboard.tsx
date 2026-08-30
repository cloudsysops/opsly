"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/shared/Card";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  StarIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolidIcon } from "@heroicons/react/24/solid";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Stats {
  npsScore: number;
  cesScore: number;
  microFeedbackAvg: number;
  microFeedbackCount: number;
  surveyResponseCount: number;
  usabilityAvg: number;
  helpfulnessAvg: number;
  reliabilityAvg: number;
  monthlyTrends: Array<{ month: string; nps: number; ces: number }>;
}

interface FeedbackItem {
  id: string;
  type: string;
  trigger: string;
  rating: number;
  comment: string | null;
  pageUrl: string | null;
  userRole: string;
  createdAt: string;
  prospect: { firstName: string; lastName: string } | null;
}

interface ChangelogEntry {
  id: string;
  title: string;
  description: string;
  category: string | null;
  createdBy: string;
  publishedAt: string | null;
  createdAt: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function FeedbackDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [feedbackTotal, setFeedbackTotal] = useState(0);
  const [feedbackPage, setFeedbackPage] = useState(1);
  const [feedbackTotalPages, setFeedbackTotalPages] = useState(1);
  const [ratingFilter, setRatingFilter] = useState("");
  const [searchFilter, setSearchFilter] = useState("");
  const [changelog, setChangelog] = useState<ChangelogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"feedback" | "changelog">(
    "feedback"
  );
  const [loading, setLoading] = useState(true);

  // Changelog form state
  const [showChangelogForm, setShowChangelogForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ChangelogEntry | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formCategory, setFormCategory] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<ChangelogEntry | null>(null);

  // ─── Data Fetching ─────────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/feedback/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  const fetchFeedback = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: feedbackPage.toString(),
        limit: "20",
      });
      if (ratingFilter) {
        params.set("minRating", ratingFilter);
        params.set("maxRating", ratingFilter);
      }
      if (searchFilter) {
        params.set("search", searchFilter);
      }
      const res = await fetch(`/api/admin/feedback/recent?${params}`);
      if (res.ok) {
        const data = await res.json();
        setFeedback(data.items);
        setFeedbackTotal(data.total);
        setFeedbackTotalPages(data.totalPages);
      }
    } catch (err) {
      console.error("Failed to fetch feedback:", err);
    }
  }, [feedbackPage, ratingFilter, searchFilter]);

  const fetchChangelog = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/feedback/changelog");
      if (res.ok) {
        const data = await res.json();
        setChangelog(data.entries);
      }
    } catch (err) {
      console.error("Failed to fetch changelog:", err);
    }
  }, []);

  useEffect(() => {
    Promise.all([fetchStats(), fetchFeedback(), fetchChangelog()]).finally(() =>
      setLoading(false)
    );
  }, [fetchStats, fetchFeedback, fetchChangelog]);

  useEffect(() => {
    fetchFeedback();
  }, [fetchFeedback]);

  // ─── Changelog CRUD ────────────────────────────────────────────────────────

  function openCreateForm() {
    setEditingEntry(null);
    setFormTitle("");
    setFormDescription("");
    setFormCategory("");
    setShowChangelogForm(true);
  }

  function openEditForm(entry: ChangelogEntry) {
    setEditingEntry(entry);
    setFormTitle(entry.title);
    setFormDescription(entry.description);
    setFormCategory(entry.category || "");
    setShowChangelogForm(true);
  }

  async function saveChangelogEntry() {
    if (!formTitle.trim() || !formDescription.trim()) return;
    setSaving(true);

    try {
      if (editingEntry) {
        const res = await fetch("/api/admin/feedback/changelog", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editingEntry.id,
            title: formTitle,
            description: formDescription,
            category: formCategory || null,
          }),
        });
        if (res.ok) {
          await fetchChangelog();
          setShowChangelogForm(false);
        }
      } else {
        const res = await fetch("/api/admin/feedback/changelog", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: formTitle,
            description: formDescription,
            category: formCategory || null,
          }),
        });
        if (res.ok) {
          await fetchChangelog();
          setShowChangelogForm(false);
        }
      }
    } catch (err) {
      console.error("Failed to save changelog entry:", err);
    } finally {
      setSaving(false);
    }
  }

  async function deleteChangelogEntry() {
    if (!deleteTarget) return;
    try {
      const res = await fetch(
        `/api/admin/feedback/changelog?id=${deleteTarget.id}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        await fetchChangelog();
      }
    } catch (err) {
      console.error("Failed to delete changelog entry:", err);
    } finally {
      setDeleteTarget(null);
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  function renderStars(rating: number) {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) =>
          star <= rating ? (
            <StarSolidIcon
              key={star}
              className="h-4 w-4 text-brand-yellow"
            />
          ) : (
            <StarIcon key={star} className="h-4 w-4 text-gray-300" />
          )
        )}
      </div>
    );
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatDateTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-navy border-t-transparent" />
      </div>
    );
  }

  const categoryData = stats
    ? [
        { category: "Usability", score: stats.usabilityAvg },
        { category: "Helpfulness", score: stats.helpfulnessAvg },
        { category: "Reliability", score: stats.reliabilityAvg },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-full w-1 rounded-full bg-emerald-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">NPS Score</p>
                <p className="text-2xl font-bold text-brand-navy">
                  {stats?.npsScore ?? "—"}
                </p>
                <p className="text-xs text-gray-500">Last 90 days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-full w-1 rounded-full bg-amber-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  CES Score
                </p>
                <p className="text-2xl font-bold text-brand-navy">
                  {stats?.cesScore ?? "—"}
                  <span className="text-sm font-normal text-gray-500">
                    {" "}
                    / 7
                  </span>
                </p>
                <p className="text-xs text-gray-500">Last 90 days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-full w-1 rounded-full bg-purple-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Micro-Feedback Avg
                </p>
                <p className="text-2xl font-bold text-brand-navy">
                  {stats?.microFeedbackAvg ?? "—"}
                  <span className="text-sm font-normal text-gray-500">
                    {" "}
                    / 5
                  </span>
                </p>
                <p className="text-xs text-gray-500">
                  {stats?.microFeedbackCount ?? 0} responses
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-full w-1 rounded-full bg-cyan-500" />
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Survey Responses
                </p>
                <p className="text-2xl font-bold text-brand-navy">
                  {stats?.surveyResponseCount ?? 0}
                </p>
                <p className="text-xs text-gray-500">Last 90 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      {stats && stats.monthlyTrends.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* NPS Trend */}
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-4 text-sm font-semibold text-brand-navy">
                NPS Trend (Monthly)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis domain={[-100, 100]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="nps"
                    stroke="#2D2F8E"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="NPS"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* CES Trend */}
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-4 text-sm font-semibold text-brand-navy">
                CES Trend (Monthly)
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={stats.monthlyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis domain={[1, 7]} tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="ces"
                    stroke="#6A469D"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    name="CES"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Category Breakdown */}
      {stats &&
        (stats.usabilityAvg > 0 ||
          stats.helpfulnessAvg > 0 ||
          stats.reliabilityAvg > 0) && (
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-4 text-sm font-semibold text-brand-navy">
                Category Breakdown (Last 90 Days)
              </h3>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 5]} tick={{ fontSize: 12 }} />
                  <YAxis
                    type="category"
                    dataKey="category"
                    tick={{ fontSize: 12 }}
                    width={100}
                  />
                  <Tooltip />
                  <Bar dataKey="score" fill="#50C8DF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          <button
            onClick={() => setActiveTab("feedback")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "feedback"
                ? "border-b-2 border-brand-navy text-brand-navy"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Recent Feedback
          </button>
          <button
            onClick={() => setActiveTab("changelog")}
            className={`pb-3 text-sm font-medium transition-colors ${
              activeTab === "changelog"
                ? "border-b-2 border-brand-navy text-brand-navy"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Changelog
          </button>
        </nav>
      </div>

      {/* Recent Feedback Tab */}
      {activeTab === "feedback" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={ratingFilter}
              onChange={(e) => {
                setRatingFilter(e.target.value);
                setFeedbackPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
            >
              <option value="">All Ratings</option>
              {[1, 2, 3, 4, 5].map((r) => (
                <option key={r} value={r}>
                  {r} Star{r !== 1 ? "s" : ""}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Search by page URL..."
              value={searchFilter}
              onChange={(e) => {
                setSearchFilter(e.target.value);
                setFeedbackPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
            />
            <span className="text-sm text-gray-500">
              {feedbackTotal} result{feedbackTotal !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Feedback List */}
          {feedback.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No feedback entries found.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {feedback.map((item) => (
                <Card key={item.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-3">
                          <span className="font-medium text-brand-navy">
                            {item.prospect
                              ? `${item.prospect.firstName} ${item.prospect.lastName}`
                              : "Unknown User"}
                          </span>
                          {renderStars(item.rating)}
                        </div>
                        {item.comment && (
                          <p className="mt-1 text-sm text-gray-700">
                            {item.comment}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                          {item.pageUrl && (
                            <span className="rounded bg-gray-100 px-2 py-0.5">
                              {item.pageUrl}
                            </span>
                          )}
                          <span>{formatDateTime(item.createdAt)}</span>
                          <span className="rounded bg-gray-100 px-2 py-0.5 capitalize">
                            {item.type.toLowerCase().replace(/_/g, " ")}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
          {feedbackTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setFeedbackPage((p) => Math.max(1, p - 1))}
                disabled={feedbackPage === 1}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {feedbackPage} of {feedbackTotalPages}
              </span>
              <button
                onClick={() =>
                  setFeedbackPage((p) => Math.min(feedbackTotalPages, p + 1))
                }
                disabled={feedbackPage === feedbackTotalPages}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Changelog Tab */}
      {activeTab === "changelog" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">
              {changelog.length} entr{changelog.length === 1 ? "y" : "ies"}
            </h3>
            <button
              onClick={openCreateForm}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navy/90 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Add Entry
            </button>
          </div>

          {/* Inline Form */}
          {showChangelogForm && (
            <Card>
              <CardContent className="p-5 space-y-4">
                <h4 className="font-medium text-brand-navy">
                  {editingEntry ? "Edit Entry" : "New Changelog Entry"}
                </h4>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Title
                  </label>
                  <input
                    type="text"
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
                    placeholder="What changed?"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
                    placeholder="Describe the change in detail..."
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    Category
                  </label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-navy focus:outline-none focus:ring-1 focus:ring-brand-navy"
                  >
                    <option value="">Select category...</option>
                    <option value="Feature">Feature</option>
                    <option value="Bug Fix">Bug Fix</option>
                    <option value="Improvement">Improvement</option>
                    <option value="UX Update">UX Update</option>
                    <option value="Performance">Performance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={saveChangelogEntry}
                    disabled={
                      saving || !formTitle.trim() || !formDescription.trim()
                    }
                    className="rounded-lg bg-brand-navy px-4 py-2 text-sm font-medium text-white hover:bg-brand-navy/90 disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Saving..." : editingEntry ? "Update" : "Create"}
                  </button>
                  <button
                    onClick={() => setShowChangelogForm(false)}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Changelog List */}
          {changelog.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No changelog entries yet. Add one to track platform changes.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {changelog.map((entry) => (
                <Card key={entry.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium text-brand-navy">
                            {entry.title}
                          </h4>
                          {entry.category && (
                            <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand-navy">
                              {entry.category}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-gray-700">
                          {entry.description}
                        </p>
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                          <span>{formatDate(entry.createdAt)}</span>
                          <span>by {entry.createdBy}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditForm(entry)}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                          title="Edit"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(entry)}
                          className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                          title="Delete"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={deleteChangelogEntry}
        title="Delete Changelog Entry"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="danger"
      />
    </div>
  );
}
