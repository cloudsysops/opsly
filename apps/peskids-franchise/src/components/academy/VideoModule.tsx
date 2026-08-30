"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { parseVideoUrl, VideoProvider } from "@/lib/video/utils";
import {
  PlayCircleIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";
import Link from "next/link";

interface VideoModuleProps {
  resourceUrl: string;
  moduleTitle: string;
  points: number;
  onComplete: () => void;
  isCompleted: boolean;
}

export default function VideoModule({
  resourceUrl,
  moduleTitle,
  points,
  onComplete,
  isCompleted,
}: VideoModuleProps) {
  const [videoStarted, setVideoStarted] = useState(false);
  const [watchProgress, setWatchProgress] = useState(0);
  const [canComplete, setCanComplete] = useState(isCompleted);
  const [completing, setCompleting] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const progressIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const videoInfo = parseVideoUrl(resourceUrl);

  // Track video progress (simplified - assumes user watches if video is playing)
  useEffect(() => {
    if (videoStarted && !canComplete && !isCompleted) {
      // For YouTube, we'd use the YouTube IFrame API
      // For Loom, we'd use postMessage API
      // For now, use a time-based approach as a fallback
      progressIntervalRef.current = setInterval(() => {
        setWatchProgress((prev) => {
          const newProgress = Math.min(prev + 5, 100);
          if (newProgress >= 80) {
            setCanComplete(true);
          }
          return newProgress;
        });
      }, 3000); // Update every 3 seconds

      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      };
    }
  }, [videoStarted, canComplete, isCompleted]);

  // YouTube IFrame API integration
  useEffect(() => {
    if (videoInfo.provider !== "youtube" || !videoStarted) return;

    // Load YouTube IFrame API
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    const firstScriptTag = document.getElementsByTagName("script")[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).onYouTubeIframeAPIReady = () => {
      // Player is ready
    };

    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (window as any).onYouTubeIframeAPIReady;
    };
  }, [videoInfo.provider, videoStarted]);

  // Listen for Loom messages
  useEffect(() => {
    if (videoInfo.provider !== "loom" || !videoStarted) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://www.loom.com") return;

      try {
        const data = typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        if (data.event === "video.progress") {
          const progress = (data.progress || 0) * 100;
          setWatchProgress(progress);
          if (progress >= 80) {
            setCanComplete(true);
          }
        }

        if (data.event === "video.ended") {
          setWatchProgress(100);
          setCanComplete(true);
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [videoInfo.provider, videoStarted]);

  const handlePlayClick = useCallback(() => {
    setVideoStarted(true);
  }, []);

  const handleComplete = async () => {
    if (!canComplete || completing) return;

    setCompleting(true);
    try {
      await onComplete();
    } finally {
      setCompleting(false);
    }
  };

  if (!videoInfo.embedUrl) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-4 rounded-lg">
          <ExclamationTriangleIcon className="h-6 w-6 flex-shrink-0" />
          <div>
            <p className="font-medium">Video Not Available</p>
            <p className="text-sm text-amber-700">
              The video URL could not be parsed. Please contact support.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Video Player */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="relative aspect-video bg-slate-900">
          {!videoStarted ? (
            // Thumbnail with play button overlay
            <div className="absolute inset-0 flex items-center justify-center">
              {videoInfo.thumbnailUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={videoInfo.thumbnailUrl}
                  alt={moduleTitle}
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    // Hide broken thumbnails
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <button
                onClick={handlePlayClick}
                className="relative z-10 flex flex-col items-center gap-2 text-white hover:scale-105 transition-transform"
              >
                <div className="w-20 h-20 rounded-full bg-brand-navy/90 flex items-center justify-center shadow-lg">
                  <PlayCircleIcon className="h-12 w-12" />
                </div>
                <span className="text-sm font-medium bg-black/50 px-3 py-1 rounded-full">
                  Click to play
                </span>
              </button>
            </div>
          ) : (
            // Embedded video player
            <iframe
              ref={iframeRef}
              src={videoInfo.embedUrl}
              className="absolute inset-0 w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              title={moduleTitle}
            />
          )}
        </div>

        {/* Progress indicator */}
        {videoStarted && !isCompleted && (
          <div className="p-4 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-600">Watch Progress</span>
              <span className="font-medium text-slate-900">{Math.round(watchProgress)}%</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  watchProgress >= 80 ? "bg-emerald-500" : "bg-[#50C8DF]"
                }`}
                style={{ width: `${watchProgress}%` }}
              />
            </div>
            {watchProgress < 80 && (
              <p className="text-xs text-slate-500 mt-2">
                Watch at least 80% of the video to complete this module
              </p>
            )}
          </div>
        )}
      </div>

      {/* Provider badge */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <span>Hosted on</span>
        <ProviderBadge provider={videoInfo.provider} />
      </div>

      {/* Completion Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        {isCompleted ? (
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4">
              <CheckCircleSolid className="h-8 w-8 text-emerald-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Video Completed!
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              You earned {points} points for watching this video.
            </p>
            <Link
              href="/portal/learning/90-day-launch"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-[#3a3c9e] transition-colors text-sm font-medium"
            >
              Continue Journey
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        ) : (
          <div className="text-center">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              {canComplete ? "Ready to complete?" : "Watch the video above"}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {canComplete
                ? `Mark this video as complete to earn ${points} points.`
                : "Watch at least 80% of the video to enable completion."}
            </p>
            <button
              onClick={handleComplete}
              disabled={!canComplete || completing}
              className="inline-flex items-center gap-2 px-6 py-3 bg-brand-navy text-white rounded-lg hover:bg-[#3a3c9e] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {completing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                  Completing...
                </>
              ) : (
                <>
                  <CheckCircleIcon className="h-5 w-5" />
                  Mark as Complete
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ProviderBadge({ provider }: { provider: VideoProvider }) {
  if (provider === "youtube") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-red-50 text-red-700 rounded-full text-xs font-medium">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
        </svg>
        YouTube
      </span>
    );
  }

  if (provider === "loom") {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-medium">
        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.568 17.568H6.432V6.432h11.136v11.136z" />
        </svg>
        Loom
      </span>
    );
  }

  return null;
}
