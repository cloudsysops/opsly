"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Replayer } from "rrweb";
import "rrweb/dist/rrweb.min.css";

interface SessionReplayPlayerProps {
  events: unknown[];
  viewportWidth?: number;
  viewportHeight?: number;
  pageUrl?: string;
  duration?: number;
}

export function SessionReplayPlayer({
  events,
  viewportWidth = 1200,
  viewportHeight = 800,
  pageUrl,
  duration: propDuration,
}: SessionReplayPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const replayerRef = useRef<Replayer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Format time as MM:SS
  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Update current time during playback
  const updateTime = useCallback(() => {
    if (replayerRef.current) {
      const time = replayerRef.current.getCurrentTime();
      setCurrentTime(time);

      if (isPlaying) {
        animationFrameRef.current = requestAnimationFrame(updateTime);
      }
    }
  }, [isPlaying]);

  useEffect(() => {
    if (!containerRef.current || !events || events.length === 0) return;

    // Clear previous replayer
    if (replayerRef.current) {
      replayerRef.current.pause();
      replayerRef.current = null;
    }
    // Remove all child nodes from container
    while (containerRef.current.firstChild) {
      containerRef.current.removeChild(containerRef.current.firstChild);
    }

    try {
      // Calculate scale
      const containerWidth = Math.min(900, viewportWidth);
      const scale = containerWidth / viewportWidth;

      // Create rrweb Replayer
      const replayer = new Replayer(events as any[], {
        root: containerRef.current,
        skipInactive: true,
        showWarning: false,
        showDebug: false,
        blockClass: "rr-block",
        liveMode: false,
        insertStyleRules: [
          "[data-sensitive] { visibility: hidden !important; }",
          // Suppress script errors visually
          "script { display: none !important; }",
        ],
        triggerFocus: false,
        mouseTail: {
          duration: 500,
          lineCap: "round",
          lineWidth: 3,
          strokeStyle: "#6A469D",
        },
      });

      replayerRef.current = replayer;

      // Get metadata
      const metadata = replayer.getMetaData();
      setTotalTime(metadata.totalTime || propDuration || 0);

      // Apply scale to the replayer iframe
      const replayerWrapper = containerRef.current.querySelector(".replayer-wrapper") as HTMLElement;
      if (replayerWrapper) {
        replayerWrapper.style.transform = `scale(${scale})`;
        replayerWrapper.style.transformOrigin = "top left";
      }

      // Listen for finish event
      replayer.on("finish", () => {
        setIsPlaying(false);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      });

      setError(null);
    } catch (err) {
      console.error("Failed to initialize rrweb replayer:", err);
      setError(err instanceof Error ? err.message : "Failed to load replay");
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (replayerRef.current) {
        replayerRef.current.pause();
        replayerRef.current = null;
      }
    };
  }, [events, viewportWidth, viewportHeight, propDuration]);

  // Handle play/pause state changes
  useEffect(() => {
    if (isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTime);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, updateTime]);

  const handlePlayPause = () => {
    if (!replayerRef.current) return;

    if (isPlaying) {
      replayerRef.current.pause();
      setIsPlaying(false);
    } else {
      replayerRef.current.play(currentTime);
      setIsPlaying(true);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseInt(e.target.value, 10);
    setCurrentTime(time);
    if (replayerRef.current) {
      replayerRef.current.pause();
      replayerRef.current.play(time);
      if (!isPlaying) {
        replayerRef.current.pause();
      }
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (replayerRef.current) {
      replayerRef.current.setConfig({ speed });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === " " || e.key === "k") {
        e.preventDefault();
        handlePlayPause();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        const newTime = Math.min(currentTime + 5000, totalTime);
        setCurrentTime(newTime);
        if (replayerRef.current) {
          replayerRef.current.play(newTime);
          if (!isPlaying) replayerRef.current.pause();
        }
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        const newTime = Math.max(currentTime - 5000, 0);
        setCurrentTime(newTime);
        if (replayerRef.current) {
          replayerRef.current.play(newTime);
          if (!isPlaying) replayerRef.current.pause();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentTime, totalTime, isPlaying]);

  if (!events || events.length === 0) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center text-gray-500">
        <div className="text-4xl mb-2">📹</div>
        <div>No replay data available</div>
        <div className="text-sm mt-1">This session has no recorded events</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-8 text-center">
        <div className="text-4xl mb-2">⚠️</div>
        <div className="text-red-700 font-medium">Failed to load replay</div>
        <div className="text-sm text-red-600 mt-1">{error}</div>
        <div className="text-xs text-gray-500 mt-4">
          This may be due to incompatible recording format or corrupted data.
        </div>
      </div>
    );
  }

  const scaledHeight = Math.min(600, viewportHeight * (Math.min(900, viewportWidth) / viewportWidth));

  return (
    <div className="space-y-4">
      {/* Page URL indicator */}
      {pageUrl && (
        <div className="text-sm text-gray-500 flex items-center gap-2">
          <span className="font-medium">Page:</span>
          <code className="bg-gray-100 px-2 py-0.5 rounded">{pageUrl}</code>
        </div>
      )}

      {/* Player container */}
      <div
        ref={containerRef}
        className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200"
        style={{
          width: Math.min(900, viewportWidth),
          height: scaledHeight,
          position: "relative",
        }}
      />

      {/* Custom controls */}
      <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
        {/* Play/Pause button */}
        <button
          onClick={handlePlayPause}
          className="w-10 h-10 flex items-center justify-center bg-brand-navy text-white rounded-full hover:bg-brand-purple transition-colors"
        >
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Time display */}
        <div className="text-sm font-mono text-gray-600 w-28">
          {formatTime(currentTime)} / {formatTime(totalTime)}
        </div>

        {/* Seek bar */}
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={totalTime || 1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-brand-cyan"
          />
        </div>

        {/* Speed selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">Speed:</span>
          <div className="flex gap-1">
            {[0.5, 1, 1.5, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => handleSpeedChange(speed)}
                className={`px-2 py-1 text-xs rounded ${
                  playbackSpeed === speed
                    ? "bg-brand-navy text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-xs text-gray-500">
        <span>Events: {events.length.toLocaleString()}</span>
        <span>Original viewport: {viewportWidth}×{viewportHeight}</span>
        <span className="text-gray-400">
          Space to play/pause • Arrow keys to seek ±5s
        </span>
      </div>
    </div>
  );
}
