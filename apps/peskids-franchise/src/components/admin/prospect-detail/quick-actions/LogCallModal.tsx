"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface LogCallModalProps {
  prospectId: string;
  prospectName: string;
  onClose: () => void;
}

export function LogCallModal({ prospectId, prospectName, onClose }: LogCallModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [callType, setCallType] = useState<"PHONE" | "VIDEO">("PHONE");
  const [direction, setDirection] = useState<"OUTBOUND" | "INBOUND">("OUTBOUND");
  const [outcome, setOutcome] = useState<string>("");
  const [duration, setDuration] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/prospects/${prospectId}/calls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          callType,
          direction,
          outcome: outcome || undefined,
          duration: duration ? parseInt(duration) * 60 : undefined, // Convert minutes to seconds
          notes: notes || undefined,
          completedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to log call");
      }

      router.refresh();
      onClose();
    } catch (err) {
      console.error("Error logging call:", err);
      setError("Failed to log call. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="log-call-title">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 id="log-call-title" className="text-lg font-semibold text-brand-navy">Log Call</h3>
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

          <p className="text-sm text-gray-500 mb-4">
            Log a call with {prospectName}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Call Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Call Type
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="callType"
                    value="PHONE"
                    checked={callType === "PHONE"}
                    onChange={(e) => setCallType(e.target.value as "PHONE")}
                    className="text-brand-cyan focus:ring-brand-cyan"
                  />
                  <span className="text-sm">Phone</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="callType"
                    value="VIDEO"
                    checked={callType === "VIDEO"}
                    onChange={(e) => setCallType(e.target.value as "VIDEO")}
                    className="text-brand-cyan focus:ring-brand-cyan"
                  />
                  <span className="text-sm">Video</span>
                </label>
              </div>
            </div>

            {/* Direction */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Direction
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="direction"
                    value="OUTBOUND"
                    checked={direction === "OUTBOUND"}
                    onChange={(e) => setDirection(e.target.value as "OUTBOUND")}
                    className="text-brand-cyan focus:ring-brand-cyan"
                  />
                  <span className="text-sm">Outbound</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="direction"
                    value="INBOUND"
                    checked={direction === "INBOUND"}
                    onChange={(e) => setDirection(e.target.value as "INBOUND")}
                    className="text-brand-cyan focus:ring-brand-cyan"
                  />
                  <span className="text-sm">Inbound</span>
                </label>
              </div>
            </div>

            {/* Outcome */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Outcome
              </label>
              <select
                value={outcome}
                onChange={(e) => setOutcome(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              >
                <option value="">Select outcome...</option>
                <option value="CONNECTED">Connected</option>
                <option value="LEFT_VOICEMAIL">Left Voicemail</option>
                <option value="NO_ANSWER">No Answer</option>
                <option value="BUSY">Busy</option>
                <option value="WRONG_NUMBER">Wrong Number</option>
              </select>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration (minutes)
              </label>
              <input
                type="number"
                min="0"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="e.g., 15"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Add notes about the call..."
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent resize-none"
              />
            </div>

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
                {isSubmitting ? "Logging..." : "Log Call"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
