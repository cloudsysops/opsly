"use client";

import { useRef, useState, useEffect } from "react";
import {
  trackVideoPlay,
  trackVideoPause,
  trackVideoComplete,
  trackVideoProgress,
} from "@/lib/tracking/eventTracking";

interface TrackedVideoProps {
  src: string;
  title?: string;
  poster?: string;
  className?: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  loop?: boolean;
}

/**
 * Video component with built-in tracking for plays, pauses, progress milestones, and completion
 *
 * Usage:
 * <TrackedVideo
 *   src="/videos/intro.mp4"
 *   title="Introduction Video"
 *   poster="/images/video-poster.jpg"
 *   className="w-full rounded-lg"
 * />
 */
export function TrackedVideo({
  src,
  title,
  poster,
  className = "",
  autoPlay = false,
  muted = false,
  controls = true,
  loop = false,
}: TrackedVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [milestones, setMilestones] = useState<Set<number>>(new Set());

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handlePlay = () => {
      trackVideoPlay(src, video.duration, title);
    };

    const handlePause = () => {
      if (!video.ended) {
        trackVideoPause(src, video.currentTime, video.duration);
      }
    };

    const handleEnded = () => {
      trackVideoComplete(src, video.duration, title);
    };

    const handleTimeUpdate = () => {
      if (!video.duration) return;

      const percentPlayed = (video.currentTime / video.duration) * 100;
      const checkMilestones: (25 | 50 | 75)[] = [25, 50, 75];

      for (const milestone of checkMilestones) {
        if (percentPlayed >= milestone && !milestones.has(milestone)) {
          setMilestones((prev) => new Set([...prev, milestone]));
          trackVideoProgress(src, video.currentTime, video.duration, milestone);
        }
      }
    };

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    video.addEventListener("ended", handleEnded);
    video.addEventListener("timeupdate", handleTimeUpdate);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [src, title, milestones]);

  return (
    <video
      ref={videoRef}
      src={src}
      poster={poster}
      className={className}
      autoPlay={autoPlay}
      muted={muted}
      controls={controls}
      loop={loop}
      playsInline
    />
  );
}

/**
 * For YouTube embeds - tracks when user interacts with iframe
 * Note: Full tracking requires YouTube iframe API integration
 */
interface TrackedYouTubeEmbedProps {
  videoId: string;
  title?: string;
  className?: string;
}

export function TrackedYouTubeEmbed({
  videoId,
  title = "YouTube video",
  className = "",
}: TrackedYouTubeEmbedProps) {
  const handleIframeFocus = () => {
    // Track that user interacted with the video
    trackVideoPlay(`https://youtube.com/watch?v=${videoId}`, undefined, title);
  };

  return (
    <div className={`relative aspect-video ${className}`} onFocus={handleIframeFocus}>
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?rel=0`}
        title={title}
        className="absolute inset-0 w-full h-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

/**
 * For Loom embeds
 */
interface TrackedLoomEmbedProps {
  videoId: string;
  title?: string;
  className?: string;
}

export function TrackedLoomEmbed({
  videoId,
  title = "Loom video",
  className = "",
}: TrackedLoomEmbedProps) {
  const handleIframeFocus = () => {
    trackVideoPlay(`https://loom.com/share/${videoId}`, undefined, title);
  };

  return (
    <div className={`relative aspect-video ${className}`} onFocus={handleIframeFocus}>
      <iframe
        src={`https://www.loom.com/embed/${videoId}`}
        title={title}
        className="absolute inset-0 w-full h-full"
        allowFullScreen
      />
    </div>
  );
}
