"use client";

import { useState } from "react";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

interface PublishControlsProps {
  moduleId: string;
  hasDraft: boolean;
  currentVersion: number;
  onPublish: () => void;
  onDiscard: () => void;
}

export function PublishControls({
  moduleId,
  hasDraft,
  currentVersion,
  onPublish,
  onDiscard,
}: PublishControlsProps) {
  const [publishing, setPublishing] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  const [showConfirm, setShowConfirm] = useState<"publish" | "discard" | null>(null);
  const [changeNotes, setChangeNotes] = useState("");
  const [alertMsg, setAlertMsg] = useState<string | null>(null);

  const handlePublish = async () => {
    setPublishing(true);
    try {
      const res = await fetch(`/api/admin/prework/${moduleId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ changeNotes }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to publish");
      }

      setShowConfirm(null);
      setChangeNotes("");
      onPublish();
    } catch (err) {
      console.error("Error publishing:", err);
      setAlertMsg(err instanceof Error ? err.message : "Failed to publish");
    } finally {
      setPublishing(false);
    }
  };

  const handleDiscard = async () => {
    setDiscarding(true);
    try {
      const res = await fetch(`/api/admin/prework/${moduleId}/draft`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to discard draft");
      }

      setShowConfirm(null);
      onDiscard();
    } catch (err) {
      console.error("Error discarding:", err);
      setAlertMsg("Failed to discard draft");
    } finally {
      setDiscarding(false);
    }
  };

  return (
    <>
      <div className="flex items-center gap-2">
        {hasDraft && (
          <button
            onClick={() => setShowConfirm("discard")}
            disabled={discarding}
            className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
          >
            Discard Draft
          </button>
        )}
        <button
          onClick={() => setShowConfirm("publish")}
          disabled={!hasDraft || publishing}
          className="px-4 py-1.5 text-sm font-medium bg-brand-purple text-white rounded-lg hover:bg-brand-purple/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {publishing ? "Publishing..." : "Publish"}
        </button>
      </div>

      {/* Confirm Modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowConfirm(null)} />
          <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            {showConfirm === "publish" ? (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Publish Changes?
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  This will make the draft live. The current version (v{currentVersion}) will be archived.
                </p>
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Change Notes (optional)
                  </label>
                  <textarea
                    value={changeNotes}
                    onChange={(e) => setChangeNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-purple"
                    placeholder="What changed in this version?"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowConfirm(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={publishing}
                    className="px-4 py-2 text-sm font-medium bg-brand-purple text-white rounded-lg hover:bg-brand-purple/90 disabled:opacity-50"
                  >
                    {publishing ? "Publishing..." : "Publish Now"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Discard Draft?
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  This will permanently delete all unpublished changes and revert to the last published version.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowConfirm(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDiscard}
                    disabled={discarding}
                    className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {discarding ? "Discarding..." : "Discard Draft"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

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
    </>
  );
}
