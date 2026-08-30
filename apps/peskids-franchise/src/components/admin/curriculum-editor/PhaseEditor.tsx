"use client";

import { useState, useEffect } from "react";
import type { PhaseData } from "./types";

interface PhaseEditorProps {
  phase: PhaseData | null; // null = creating new
  programId: string;
  onSave: () => void;
  onDelete?: () => void;
  saving: boolean;
  setSaving: (saving: boolean) => void;
}

export function PhaseEditor({
  phase,
  programId,
  onSave,
  onDelete,
  saving,
  setSaving,
}: PhaseEditorProps) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    dayStart: "",
    dayEnd: "",
    imageUrl: "",
  });

  useEffect(() => {
    if (phase) {
      setForm({
        title: phase.title,
        description: phase.description || "",
        dayStart: phase.dayStart?.toString() || "",
        dayEnd: phase.dayEnd?.toString() || "",
        imageUrl: phase.imageUrl || "",
      });
    } else {
      setForm({ title: "", description: "", dayStart: "", dayEnd: "", imageUrl: "" });
    }
  }, [phase]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = phase
        ? `/api/admin/bootcamp/phases/${phase.id}`
        : "/api/admin/bootcamp/phases";
      const method = phase ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          dayStart: form.dayStart ? parseInt(form.dayStart) : undefined,
          dayEnd: form.dayEnd ? parseInt(form.dayEnd) : undefined,
          imageUrl: form.imageUrl || undefined,
          programId: phase ? undefined : programId,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error("Save phase error:", data.error);
        return;
      }

      onSave();
    } catch (error) {
      console.error("Failed to save phase:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-brand-navy">
          {phase ? "Edit Phase" : "New Phase"}
        </h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title *
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
            placeholder="e.g., Week 1 - Orientation & Setup"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
            placeholder="Describe what franchisees will learn..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Day Start
            </label>
            <input
              type="number"
              value={form.dayStart}
              onChange={(e) => setForm({ ...form, dayStart: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
              placeholder="e.g., 1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Day End
            </label>
            <input
              type="number"
              value={form.dayEnd}
              onChange={(e) => setForm({ ...form, dayEnd: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
              placeholder="e.g., 7"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image URL
          </label>
          <input
            type="url"
            value={form.imageUrl}
            onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-purple focus:border-transparent"
            placeholder="https://..."
          />
        </div>

        <div className="flex items-center gap-3 pt-4 border-t">
          <button
            onClick={handleSave}
            disabled={saving || !form.title}
            className="px-4 py-2 bg-brand-navy text-white rounded-lg text-sm font-medium hover:bg-brand-purple transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : phase ? "Update Phase" : "Create Phase"}
          </button>
          {phase && onDelete && (
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors"
            >
              Delete Phase
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
