"use client";

import { useState, useEffect, useCallback } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";

interface TerritoryNote {
  id: string;
  content: string;
  authorId: string;
  createdAt: string;
}

interface TerritoryCommentsProps {
  territoryId: string;
}

export default function TerritoryComments({
  territoryId,
}: TerritoryCommentsProps) {
  const [notes, setNotes] = useState<TerritoryNote[]>([]);
  const [newComment, setNewComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchNotes = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/admin/territories/${territoryId}/notes`
      );
      if (!res.ok) return;
      const data = await res.json();
      setNotes(data.notes || []);
    } catch {
      // Ignore errors
    } finally {
      setIsLoading(false);
    }
  }, [territoryId]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  const handleSubmit = async () => {
    if (!newComment.trim()) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(
        `/api/admin/territories/${territoryId}/notes`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: newComment.trim() }),
        }
      );

      if (res.ok) {
        setNewComment("");
        await fetchNotes();
      }
    } catch {
      // Ignore errors
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-3">
      <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
        Comments
      </h4>

      {isLoading && (
        <div className="flex items-center justify-center py-3">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-navy border-t-transparent" />
        </div>
      )}

      {!isLoading && notes.length === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">
          No comments yet
        </p>
      )}

      <div className="space-y-2 max-h-40 overflow-y-auto">
        {notes.map((note) => (
          <div key={note.id} className="bg-gray-50 rounded-lg p-2">
            <p className="text-xs text-gray-800 whitespace-pre-wrap">
              {note.content}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">
              {new Date(note.createdAt).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Add a comment..."
          className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-brand-navy focus:outline-none"
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!newComment.trim() || isSubmitting}
          className="px-2.5 py-1.5 bg-brand-navy text-white rounded-lg hover:bg-opacity-90 disabled:opacity-50"
        >
          <PaperAirplaneIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
