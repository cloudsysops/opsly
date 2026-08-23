"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Auto-reload on chunk load failures (happens after deploys when
    // the browser has stale JS cached with old chunk hashes)
    const isChunkError =
      error.message?.includes("ChunkLoadError") ||
      error.message?.includes("Loading chunk") ||
      error.message?.includes("Failed to fetch dynamically imported module") ||
      error.message?.includes("Minified React error #310") ||
      error.message?.includes("Minified React error #418") ||
      error.message?.includes("Minified React error #423");

    if (isChunkError) {
      // Only auto-reload once to avoid infinite loops
      const key = "chunk-error-reload";
      const lastReload = sessionStorage.getItem(key);
      const now = Date.now();

      if (!lastReload || now - parseInt(lastReload) > 10000) {
        sessionStorage.setItem(key, now.toString());
        window.location.reload();
        return;
      }
    }
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          Something went wrong
        </h1>
        <p className="text-gray-600 mb-6">
          This usually resolves with a quick refresh. If it keeps happening,
          please contact support.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="px-5 py-2.5 bg-brand-navy text-white rounded-lg text-sm font-medium hover:bg-brand-purple transition-colors"
          >
            Refresh Page
          </button>
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
}
