"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { StarIcon as StarOutline } from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/24/solid";
import { XMarkIcon } from "@heroicons/react/24/outline";

export default function FeedbackWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        if (isOpen && !isSubmitted) setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, isSubmitted]);

  function resetForm() {
    setIsSubmitted(false);
    setRating(0);
    setHoveredStar(0);
    setComment("");
  }

  async function handleSubmit() {
    if (rating === 0 || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PAGE_FEEDBACK",
          trigger: "PERSISTENT_WIDGET",
          rating,
          comment: comment.trim() || null,
          pageUrl: pathname,
        }),
      });
      setIsSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        resetForm();
      }, 1500);
    } catch {
      // Silently fail — don't block the user
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleToggle() {
    if (isSubmitted) resetForm();
    setIsOpen(!isOpen);
  }

  const stars = [1, 2, 3, 4, 5];

  return (
    <>
      {/* Desktop: vertical "Feedback" tab on right edge */}
      <div ref={popoverRef} className="fixed right-0 top-1/2 -translate-y-1/2 z-50 hidden md:block">
        <button
          onClick={handleToggle}
          className="absolute right-0 top-1/2 -translate-y-1/2 bg-gray-600/80 hover:bg-brand-navy text-white text-xs font-medium px-2 py-3 rounded-l-md transition-colors"
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          Feedback
        </button>

        {isOpen && (
          <div className="absolute right-10 top-1/2 -translate-y-1/2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>

            {isSubmitted ? (
              <div className="text-center py-4">
                <div className="text-brand-green font-semibold text-lg">Thank you!</div>
                <p className="text-gray-500 text-sm mt-1">Your feedback helps us improve.</p>
              </div>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-gray-800 mb-3">
                  How&apos;s this page?
                </h3>

                <div className="flex gap-1 mb-3">
                  {stars.map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      className="transition-transform hover:scale-110"
                    >
                      {star <= (hoveredStar || rating) ? (
                        <StarSolid className="h-7 w-7 text-brand-yellow" />
                      ) : (
                        <StarOutline className="h-7 w-7 text-gray-300" />
                      )}
                    </button>
                  ))}
                </div>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Any additional thoughts? (optional)"
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy placeholder-gray-400"
                />

                <button
                  onClick={handleSubmit}
                  disabled={rating === 0 || isSubmitting}
                  className="mt-2 w-full bg-brand-navy hover:bg-brand-purple disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-md transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    "Submit Feedback"
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mobile: small floating button bottom-right */}
      <div className="fixed bottom-20 right-4 z-50 md:hidden">
        <button
          onClick={handleToggle}
          className="bg-gray-600/80 hover:bg-brand-navy text-white rounded-full p-2.5 shadow-lg transition-colors"
        >
          <StarOutline className="h-5 w-5" />
        </button>

        {isOpen && (
          <div className="absolute bottom-12 right-0 w-64 bg-white rounded-lg shadow-xl border border-gray-200 p-4">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>

            {isSubmitted ? (
              <div className="text-center py-3">
                <div className="text-brand-green font-semibold">Thank you!</div>
                <p className="text-gray-500 text-xs mt-1">Your feedback helps us improve.</p>
              </div>
            ) : (
              <>
                <h3 className="text-sm font-semibold text-gray-800 mb-2">
                  How&apos;s this page?
                </h3>

                <div className="flex gap-1 mb-2">
                  {stars.map((star) => (
                    <button
                      key={star}
                      onClick={() => setRating(star)}
                      onMouseEnter={() => setHoveredStar(star)}
                      onMouseLeave={() => setHoveredStar(0)}
                      className="transition-transform hover:scale-110"
                    >
                      {star <= (hoveredStar || rating) ? (
                        <StarSolid className="h-6 w-6 text-brand-yellow" />
                      ) : (
                        <StarOutline className="h-6 w-6 text-gray-300" />
                      )}
                    </button>
                  ))}
                </div>

                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Any thoughts? (optional)"
                  rows={2}
                  className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-navy/30 focus:border-brand-navy placeholder-gray-400"
                />

                <button
                  onClick={handleSubmit}
                  disabled={rating === 0 || isSubmitting}
                  className="mt-2 w-full bg-brand-navy hover:bg-brand-purple disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium py-2 rounded-md transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Submitting...
                    </>
                  ) : (
                    "Submit"
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
