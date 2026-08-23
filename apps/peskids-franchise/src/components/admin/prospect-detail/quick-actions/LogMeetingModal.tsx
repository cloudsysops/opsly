"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface LogMeetingModalProps {
  prospectId: string;
  prospectName: string;
  prospectEmail: string;
  onClose: () => void;
}

export function LogMeetingModal({
  prospectId,
  prospectName,
  prospectEmail,
  onClose,
}: LogMeetingModalProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [meetingType, setMeetingType] = useState<string>("DISCOVERY_CALL");
  const [scheduledFor, setScheduledFor] = useState("");
  const [duration, setDuration] = useState("30");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!title.trim()) {
      setError("Title is required");
      setIsSubmitting(false);
      return;
    }

    if (!scheduledFor) {
      setError("Date and time is required");
      setIsSubmitting(false);
      return;
    }

    try {
      const response = await fetch(`/api/prospects/${prospectId}/meetings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          meetingType,
          scheduledFor: new Date(scheduledFor).toISOString(),
          duration: parseInt(duration),
          location: location.trim() || undefined,
          description: description.trim() || undefined,
          attendees: [prospectEmail],
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to schedule meeting");
      }

      router.refresh();
      onClose();
    } catch (err) {
      console.error("Error scheduling meeting:", err);
      setError("Failed to schedule meeting. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true" aria-labelledby="log-meeting-title">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 id="log-meeting-title" className="text-lg font-semibold text-brand-navy">Schedule Meeting</h3>
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
            Schedule a meeting with {prospectName}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Discovery Call with John"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              />
            </div>

            {/* Meeting Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meeting Type
              </label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              >
                <option value="DISCOVERY_CALL">Discovery Call</option>
                <option value="INTERVIEW">Interview</option>
                <option value="PRE_WORK_REVIEW">Pre-Work Review</option>
                <option value="FOLLOW_UP">Follow Up</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Date/Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Date & Time *
              </label>
              <input
                type="datetime-local"
                value={scheduledFor}
                onChange={(e) => setScheduledFor(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Duration
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              >
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
                <option value="45">45 minutes</option>
                <option value="60">1 hour</option>
                <option value="90">1.5 hours</option>
                <option value="120">2 hours</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Location / Link
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Zoom link or address"
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Add notes or agenda..."
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
                {isSubmitting ? "Scheduling..." : "Schedule"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
