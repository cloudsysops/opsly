"use client";

import { useState, useEffect } from "react";
import { StarIcon as StarOutline } from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";

interface MilestoneFeedbackPromptProps {
  milestoneTitle: string;
  moduleId?: string;
  taskId?: string;
  onDismiss: () => void;
}

export default function MilestoneFeedbackPrompt({
  milestoneTitle,
  moduleId,
  taskId,
  onDismiss,
}: MilestoneFeedbackPromptProps) {
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [visible, setVisible] = useState(false);
  const [canShow, setCanShow] = useState(false);

  // Check throttle before showing
  useEffect(() => {
    async function checkThrottle() {
      try {
        const res = await fetch("/api/feedback/throttle");
        if (res.ok) {
          const data = await res.json();
          if (data.canPrompt) {
            setCanShow(true);
            // Record that we showed a prompt
            fetch("/api/feedback/throttle", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "shown" }),
            }).catch(console.error);
          }
        }
      } catch {
        // Silently fail — don't block the user
      }
    }
    checkThrottle();
  }, []);

  // Slide in after a short delay
  useEffect(() => {
    if (canShow) {
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, [canShow]);

  async function handleSubmit() {
    if (rating === 0 || isSubmitting) return;
    setIsSubmitting(true);

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "MILESTONE_COMPLETION",
          trigger: "MILESTONE_PROMPT",
          rating,
          comment: comment || null,
          pageUrl: window.location.pathname,
          metadata: { milestoneTitle, moduleId, taskId },
        }),
      });
      setIsSubmitted(true);
      setTimeout(() => {
        onDismiss();
      }, 1500);
    } catch {
      onDismiss();
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleDismiss() {
    // Record dismissal for throttle
    fetch("/api/feedback/throttle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "dismissed" }),
    }).catch(console.error);
    onDismiss();
  }

  if (!canShow) return null;

  return (
    <div
      className={`fixed bottom-24 right-6 z-40 w-80 transition-all duration-500 ease-out ${
        visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
      }`}
    >
      {isSubmitted ? (
        <div className="bg-white rounded-2xl shadow-xl border border-brand-green/30 p-5 text-center">
          <div className="text-2xl mb-1">&#10024;</div>
          <p className="text-sm font-semibold text-gray-900">Thanks for your feedback!</p>
          <p className="text-xs text-gray-500 mt-1">It helps us improve the portal for everyone.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-brand-navy/5 to-brand-purple/5">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">How was that?</p>
              <p className="text-xs text-gray-500 truncate">{milestoneTitle}</p>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors flex-shrink-0"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>

          {/* Rating */}
          <div className="px-4 py-3">
            <div className="flex justify-center gap-1 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoveredStar(star)}
                  onMouseLeave={() => setHoveredStar(0)}
                  className="p-0.5 transition-transform hover:scale-110"
                >
                  {star <= (hoveredStar || rating) ? (
                    <StarSolid className="h-7 w-7 text-yellow-400" />
                  ) : (
                    <StarOutline className="h-7 w-7 text-gray-300" />
                  )}
                </button>
              ))}
            </div>

            {rating > 0 && (
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Any additional thoughts? (optional)"
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-navy/20 focus:border-brand-navy resize-none"
              />
            )}
          </div>

          {/* Submit */}
          {rating > 0 && (
            <div className="px-4 pb-3">
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-2 text-sm font-medium text-white bg-brand-navy hover:bg-brand-purple rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? "Sending..." : "Submit"}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
