"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ProspectActionsProps {
  prospectId: string;
  currentStage: string;
  currentScore: number;
  assignedTo: string | null;
  prospectName?: string;
  prospectEmail?: string;
}

const stages = [
  { value: "NEW_INQUIRY", label: "New Inquiry" },
  { value: "INITIAL_CONTACT", label: "Initial Contact" },
  { value: "DISCOVERY_CALL", label: "Discovery Call" },
  { value: "PRE_WORK_IN_PROGRESS", label: "Pre-Work In Progress" },
  { value: "PRE_WORK_COMPLETE", label: "Pre-Work Complete" },
  { value: "INTERVIEW", label: "Interview" },
  { value: "SELECTION_REVIEW", label: "Selection Review" },
  { value: "SELECTED", label: "Selected" },
  { value: "REJECTED", label: "Rejected" },
  { value: "WITHDRAWN", label: "Withdrawn" },
];

export function ProspectActions({
  prospectId,
  currentStage,
  currentScore,
  assignedTo,
  prospectName,
  prospectEmail,
}: ProspectActionsProps) {
  const router = useRouter();
  const [stage, setStage] = useState(currentStage);
  const [score, setScore] = useState(currentScore);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleStageChange(newStage: string) {
    if (newStage === stage) return;

    setIsUpdating(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pipelineStage: newStage }),
      });

      if (!response.ok) {
        throw new Error("Failed to update stage");
      }

      setStage(newStage);
      setMessage({ type: "success", text: "Stage updated successfully" });
      router.refresh();
    } catch (error) {
      console.error("Error updating stage:", error);
      setMessage({ type: "error", text: "Failed to update stage" });
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleScoreUpdate() {
    if (score === currentScore) return;

    setIsUpdating(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prospectScore: score }),
      });

      if (!response.ok) {
        throw new Error("Failed to update score");
      }

      setMessage({ type: "success", text: "Score updated successfully" });
      router.refresh();
    } catch (error) {
      console.error("Error updating score:", error);
      setMessage({ type: "error", text: "Failed to update score" });
      setScore(currentScore);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleLogContact() {
    setIsUpdating(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/prospects/${prospectId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lastContactAt: new Date().toISOString() }),
      });

      if (!response.ok) {
        throw new Error("Failed to log contact");
      }

      setMessage({ type: "success", text: "Contact logged" });
      router.refresh();
    } catch (error) {
      console.error("Error logging contact:", error);
      setMessage({ type: "error", text: "Failed to log contact" });
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete() {
    setIsDeleting(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/prospects/${prospectId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to delete prospect");
      }

      // Redirect to prospects list after successful delete
      router.push("/admin/prospects");
      router.refresh();
    } catch (error) {
      console.error("Error deleting prospect:", error);
      setMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to delete prospect" });
      setShowDeleteConfirm(false);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <div
          className={`p-3 rounded-lg text-sm ${
            message.type === "success"
              ? "bg-green-50 text-green-700"
              : "bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Stage Selector */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Pipeline Stage
        </label>
        <select
          value={stage}
          onChange={(e) => handleStageChange(e.target.value)}
          disabled={isUpdating}
          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent disabled:opacity-50"
        >
          {stages.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {/* Score Input */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Prospect Score (0-100)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min={0}
            max={100}
            value={score}
            onChange={(e) => setScore(parseInt(e.target.value) || 0)}
            disabled={isUpdating}
            className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent disabled:opacity-50"
          />
          <button
            onClick={handleScoreUpdate}
            disabled={isUpdating || score === currentScore}
            className="px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-purple transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Update
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="pt-4 border-t space-y-2">
        <button
          onClick={handleLogContact}
          disabled={isUpdating}
          className="w-full px-4 py-2 bg-brand-cyan text-brand-navy rounded-lg hover:bg-brand-cyan/80 transition-colors disabled:opacity-50 text-sm font-medium"
        >
          Log Contact Now
        </button>
        <a
          href={`mailto:${assignedTo || ""}`}
          className="block w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium text-center"
        >
          Send Email
        </a>
      </div>

      {/* Danger Zone */}
      <div className="pt-4 mt-4 border-t border-red-200">
        <button
          onClick={() => setShowDeleteConfirm(true)}
          disabled={isUpdating || isDeleting}
          className="w-full px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 text-sm font-medium"
        >
          Delete Prospect
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Prospect</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-gray-700">
                Are you sure you want to permanently delete{" "}
                <span className="font-semibold">{prospectName || "this prospect"}</span>
                {prospectEmail && (
                  <span className="text-gray-500"> ({prospectEmail})</span>
                )}
                ?
              </p>
              <p className="mt-2 text-sm text-gray-500">
                All associated data including notes, activities, pre-work submissions, and conversations will be deleted.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                disabled={isDeleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete Permanently"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
