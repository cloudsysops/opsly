"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AddNoteModalProps {
  prospectId: string;
  onClose: () => void;
}

export function AddNoteModal({ prospectId, onClose }: AddNoteModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!content.trim()) {
      setError("Note content is required");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/prospects/${prospectId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: content.trim(),
          isPinned,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to add note");
      }

      router.refresh();
      onClose();
    } catch (err) {
      console.error("Error adding note:", err);
      setError("Failed to add note. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="add-note-title">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 id="add-note-title" className="text-lg font-semibold text-brand-navy">Add Note</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
              aria-label="Close dialog"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Note *
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                placeholder="Add your note..."
                autoFocus
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent resize-none"
              />
            </div>

            {/* Pin option */}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="rounded border-gray-300 text-brand-cyan focus:ring-brand-cyan"
              />
              <span className="text-sm text-gray-600">Pin this note</span>
            </label>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 text-white bg-brand-navy rounded-lg hover:bg-brand-purple transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Adding..." : "Add Note"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
