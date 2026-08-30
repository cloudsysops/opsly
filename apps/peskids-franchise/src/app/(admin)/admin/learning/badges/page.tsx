"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/shared/Card";
import { ConfirmModal } from "@/components/shared/ConfirmModal";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  TrophyIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";

interface Badge {
  id: string;
  slug: string;
  title: string;
  description: string;
  imageUrl: string | null;
  points: number;
  criteria: string;
  createdAt: string;
  earnedCount: number;
}

interface BadgeDetail extends Badge {
  earners: {
    id: string;
    name: string;
    email: string;
    earnedAt: string;
  }[];
}

export default function BadgesPage() {
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  // Editor state
  const [showEditor, setShowEditor] = useState(false);
  const [editingBadge, setEditingBadge] = useState<Badge | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    imageUrl: "",
    points: 25,
    criteria: "",
  });
  const [saving, setSaving] = useState(false);

  // Detail modal
  const [selectedBadge, setSelectedBadge] = useState<BadgeDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Dialog state
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [badgeToDelete, setBadgeToDelete] = useState<Badge | null>(null);

  const fetchBadges = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/bootcamp/badges");
      const data = await res.json();
      setBadges(data.badges || []);
    } catch (error) {
      console.error("Failed to fetch badges:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBadges();
  }, [fetchBadges]);

  const fetchBadgeDetail = async (id: string) => {
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/admin/bootcamp/badges/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedBadge(data.badge);
      }
    } catch (error) {
      console.error("Failed to fetch badge detail:", error);
    } finally {
      setDetailLoading(false);
    }
  };

  const startNew = () => {
    setEditingBadge(null);
    setForm({
      title: "",
      description: "",
      imageUrl: "",
      points: 25,
      criteria: "",
    });
    setShowEditor(true);
  };

  const startEdit = (badge: Badge) => {
    setEditingBadge(badge);
    setForm({
      title: badge.title,
      description: badge.description,
      imageUrl: badge.imageUrl || "",
      points: badge.points,
      criteria: badge.criteria,
    });
    setShowEditor(true);
  };

  const saveBadge = async () => {
    try {
      setSaving(true);
      const url = editingBadge
        ? `/api/admin/bootcamp/badges/${editingBadge.id}`
        : "/api/admin/bootcamp/badges";
      const method = editingBadge ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const data = await res.json();
        setAlertMsg(data.error || "Failed to save badge");
        return;
      }

      await fetchBadges();
      setShowEditor(false);
    } catch (error) {
      console.error("Failed to save badge:", error);
      setAlertMsg("Failed to save badge");
    } finally {
      setSaving(false);
    }
  };

  const deleteBadge = (badge: Badge) => {
    setBadgeToDelete(badge);
  };

  const doDeleteBadge = async () => {
    if (!badgeToDelete) return;
    const badge = badgeToDelete;
    setBadgeToDelete(null);

    try {
      const res = await fetch(`/api/admin/bootcamp/badges/${badge.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        setAlertMsg(data.error || "Failed to delete badge");
        return;
      }

      await fetchBadges();
    } catch (error) {
      console.error("Failed to delete badge:", error);
      setAlertMsg("Failed to delete badge");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand-navy">
            Badge Management
          </h1>
          <p className="mt-1.5 sm:mt-2 text-sm sm:text-base text-gray-600">
            Manage achievement badges for franchisees
          </p>
        </div>
        <button
          onClick={startNew}
          className="flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-lg text-sm font-medium hover:bg-brand-purple transition-colors"
        >
          <PlusIcon className="h-4 w-4" />
          Add Badge
        </button>
      </div>

      {/* Badges Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
        </div>
      ) : badges.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <TrophyIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No badges created yet</p>
            <button
              onClick={startNew}
              className="mt-2 text-sm text-brand-purple hover:underline"
            >
              Create your first badge
            </button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {badges.map((badge) => (
            <Card key={badge.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <TrophyIcon className="h-6 w-6 text-yellow-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {badge.title}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">
                      {badge.description}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <div className="text-lg font-bold text-brand-purple">
                        {badge.points}
                      </div>
                      <div className="text-xs text-gray-500">points</div>
                    </div>
                    <button
                      onClick={() => fetchBadgeDetail(badge.id)}
                      className="flex items-center gap-1 text-sm text-gray-600 hover:text-brand-purple"
                    >
                      <UserGroupIcon className="h-4 w-4" />
                      <span>{badge.earnedCount} earned</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEdit(badge)}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4 text-gray-500" />
                    </button>
                    <button
                      onClick={() => deleteBadge(badge)}
                      className="p-2 hover:bg-red-100 rounded-lg"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4 text-red-500" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs text-gray-500">
                    <span className="font-medium">Criteria:</span> {badge.criteria}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {showEditor && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-brand-navy">
                {editingBadge ? "Edit Badge" : "New Badge"}
              </h2>
              <button
                onClick={() => setShowEditor(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                  placeholder="e.g., Quick Starter"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                  placeholder="Short description of the badge"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Points
                  </label>
                  <input
                    type="number"
                    value={form.points}
                    onChange={(e) =>
                      setForm({ ...form, points: parseInt(e.target.value) || 25 })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Image URL (optional)
                  </label>
                  <input
                    type="url"
                    value={form.imageUrl}
                    onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                    placeholder="https://..."
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Earning Criteria *
                </label>
                <textarea
                  value={form.criteria}
                  onChange={(e) => setForm({ ...form, criteria: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
                  placeholder="Describe how to earn this badge..."
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveBadge}
                disabled={
                  saving || !form.title || !form.description || !form.criteria
                }
                className="px-4 py-2 bg-brand-navy text-white rounded-lg text-sm font-medium hover:bg-brand-purple transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : editingBadge ? "Update" : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={!!badgeToDelete}
        title="Delete Badge"
        message={
          badgeToDelete
            ? badgeToDelete.earnedCount > 0
              ? `Delete badge "${badgeToDelete.title}"? This will remove the badge from ${badgeToDelete.earnedCount} franchisees who earned it.`
              : `Delete badge "${badgeToDelete.title}"? This cannot be undone.`
            : ""
        }
        confirmLabel="Delete"
        confirmVariant="danger"
        onConfirm={doDeleteBadge}
        onCancel={() => setBadgeToDelete(null)}
      />

      {/* Alert Modal */}
      <ConfirmModal
        isOpen={!!alertMsg}
        title="Notice"
        message={alertMsg || ""}
        confirmLabel="OK"
        cancelLabel=""
        confirmVariant="primary"
        onConfirm={() => setAlertMsg(null)}
        onCancel={() => setAlertMsg(null)}
      />

      {/* Detail Modal */}
      {selectedBadge && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div className="flex items-center gap-3">
                <TrophyIcon className="h-6 w-6 text-yellow-600" />
                <h2 className="text-xl font-bold text-brand-navy">
                  {selectedBadge.title}
                </h2>
              </div>
              <button
                onClick={() => setSelectedBadge(null)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
              <p className="text-gray-600 mb-4">{selectedBadge.description}</p>
              <p className="text-sm text-gray-500 mb-6">
                <span className="font-medium">Criteria:</span> {selectedBadge.criteria}
              </p>

              <h3 className="font-semibold text-brand-navy mb-3">
                Earned By ({selectedBadge.earners.length})
              </h3>

              {detailLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-navy"></div>
                </div>
              ) : selectedBadge.earners.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">
                  No franchisees have earned this badge yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {selectedBadge.earners.map((earner) => (
                    <div
                      key={earner.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <div className="font-medium text-gray-900 text-sm">
                          {earner.name}
                        </div>
                        <div className="text-xs text-gray-500">{earner.email}</div>
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(earner.earnedAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
