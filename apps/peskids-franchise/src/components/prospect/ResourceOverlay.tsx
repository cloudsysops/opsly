"use client";

import { useState, useEffect, useRef } from "react";
import { XMarkIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import DOMPurify from "dompurify";

interface ResourceOverlayProps {
  pageId: string;
  hash?: string | null;
  onClose: () => void;
}

export default function ResourceOverlay({ pageId, hash, onClose }: ResourceOverlayProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    async function fetchPage() {
      try {
        const res = await fetch(`/api/franchisee/operations/manual/${pageId}`);
        if (res.ok) {
          const data = await res.json();
          setTitle(data.page.title);
          // Content is sanitized with DOMPurify before rendering
          setContent(DOMPurify.sanitize(data.page.content));
        }
      } catch (err) {
        console.error("Failed to fetch manual page:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPage();
  }, [pageId]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to hash anchor after content loads
  useEffect(() => {
    if (loading || !hash || !scrollContainerRef.current) return;
    // Wait for DOM paint then scroll within the overlay's scroll container
    const timer = setTimeout(() => {
      const el = document.getElementById(hash);
      const container = scrollContainerRef.current;
      if (el && container) {
        // Calculate offset within the scrollable container
        const elRect = el.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const offset = elRect.top - containerRect.top + container.scrollTop;
        container.scrollTo({ top: offset - 16, behavior: "smooth" });
      }
    }, 150);
    return () => clearTimeout(timer);
  }, [loading, hash]);

  // Prevent body scroll when overlay is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Panel */}
      <div className="relative w-full max-w-3xl max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-brand-navy">{title || "Loading..."}</h2>
            <p className="text-xs text-gray-500">From: Operations Manual</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Content - sanitized with DOMPurify in useEffect */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy" />
            </div>
          ) : (
            <div
              className="prose prose-sm max-w-none
                prose-headings:text-brand-navy prose-headings:font-semibold
                prose-a:text-brand-purple prose-a:no-underline hover:prose-a:underline
                prose-strong:text-gray-900
                prose-ul:list-disc prose-ol:list-decimal
                prose-li:text-gray-700
                prose-p:text-gray-700 prose-p:leading-relaxed"
              dangerouslySetInnerHTML={{ __html: content }}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <a
            href={`/portal/learning/manual/${pageId}${hash ? `#${hash}` : ""}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-brand-purple hover:text-brand-navy transition-colors"
          >
            <ArrowTopRightOnSquareIcon className="h-4 w-4" />
            Open full page in new tab
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
