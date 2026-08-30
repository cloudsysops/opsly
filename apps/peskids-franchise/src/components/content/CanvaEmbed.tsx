"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  ArrowsPointingOutIcon,
  ArrowTopRightOnSquareIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

interface CanvaEmbedProps {
  url: string;
  designId?: string;
  height?: string;
  title?: string;
  className?: string;
}

export function CanvaEmbed({
  url,
  height,
  title = "Canva Design",
  className = "",
}: CanvaEmbedProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const embedUrl = url.includes("?embed") ? url : `${url}?embed`;

  const getSmartHeight = () => {
    if (height && height !== "auto" && height !== "2000vh") return height;
    return "800px";
  };

  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  const handleError = useCallback(() => {
    setIsLoading(false);
    setHasError(true);
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen]);

  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isFullscreen]);

  if (hasError) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center bg-gray-50 rounded-xl">
        <p className="text-gray-500 mb-4">
          Unable to load the design content.
        </p>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-brand-purple hover:text-purple-700 font-medium"
        >
          <ArrowTopRightOnSquareIcon className="w-4 h-4" />
          Open in Canva
        </a>
      </div>
    );
  }

  return (
    <>
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white shadow-sm">
            <h3 className="font-semibold text-gray-900">{title}</h3>
            <button
              onClick={toggleFullscreen}
              className="p-2 hover:bg-gray-100 rounded-lg"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          <div
            className="flex-1 overflow-auto bg-gray-50"
            onContextMenu={(e) => e.preventDefault()}
          >
            <div
              className="min-h-full"
              style={{ userSelect: "none", WebkitUserSelect: "none" }}
            >
              <iframe
                src={embedUrl}
                title={title}
                loading="lazy"
                allowFullScreen
                className="w-full border-0"
                style={{ height: "max(100vh, 3000px)" }}
              />
            </div>
          </div>
        </div>
      )}

      <div ref={containerRef} className={`relative ${className}`}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-50 rounded-xl z-10 min-h-[400px]">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-3 border-purple-200 border-t-purple-500 rounded-full animate-spin" />
              <p className="text-sm text-gray-500">Loading design...</p>
            </div>
          </div>
        )}

        <div
          className="relative rounded-xl overflow-hidden border border-gray-200 bg-white shadow-sm"
          onContextMenu={(e) => e.preventDefault()}
          style={{ userSelect: "none", WebkitUserSelect: "none" }}
        >
          <iframe
            src={embedUrl}
            title={title}
            loading="lazy"
            allowFullScreen
            onLoad={handleLoad}
            onError={handleError}
            className="w-full border-0"
            style={{
              height: getSmartHeight(),
              minHeight: "400px",
              maxHeight: "calc(100vh - 200px)",
            }}
          />
        </div>

        <div className="mt-3 flex justify-end">
          <button
            onClick={toggleFullscreen}
            className="inline-flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 bg-white shadow-sm"
          >
            <ArrowsPointingOutIcon className="w-4 h-4" />
            Fullscreen
          </button>
        </div>
      </div>
    </>
  );
}
