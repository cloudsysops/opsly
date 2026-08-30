"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface AddNoteFormProps {
  prospectId: string;
}

export function AddNoteForm({ prospectId }: AddNoteFormProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/prospects/${prospectId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: content.trim(), isPinned }),
      });

      if (!response.ok) {
        throw new Error("Failed to add note");
      }

      setContent("");
      setIsPinned(false);
      setMessage({ type: "success", text: "Note added successfully" });
      router.refresh();
    } catch (error) {
      console.error("Error adding note:", error);
      setMessage({ type: "error", text: "Failed to add note" });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {message && (
        <div
          className={`p-2 rounded text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Add a note..."
        rows={3}
        disabled={isSubmitting}
        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent resize-none disabled:opacity-50"
      />

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={isPinned}
            onChange={(e) => setIsPinned(e.target.checked)}
            disabled={isSubmitting}
            className="rounded border-gray-300 text-brand-cyan focus:ring-brand-cyan"
          />
          Pin this note
        </label>

        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className="px-4 py-2 bg-brand-navy text-white text-sm font-medium rounded-lg hover:bg-brand-purple transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Adding..." : "Add Note"}
        </button>
      </div>
    </form>
  );
}
