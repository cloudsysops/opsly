"use client";

import { useEffect, useRef } from "react";
import { record } from "rrweb";

// Configuration
const BATCH_INTERVAL_MS = 5000; // Send events every 5 seconds
const MAX_EVENTS = 50000; // Maximum events per session (rrweb events are smaller)

/**
 * Session Recorder component - records user interactions using rrweb for full replay
 *
 * Records:
 * - Full DOM snapshots
 * - All DOM mutations
 * - Mouse movements, clicks, scrolls
 * - Form inputs (text masked by default)
 * - Window resize
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RecordEvent = any; // rrweb event type (alpha versions have unstable types)

export function SessionRecorder({ enabled = true }: { enabled?: boolean }) {
  const eventsRef = useRef<RecordEvent[]>([]);
  const stopRecordingRef = useRef<(() => void) | null>(null);
  const isInitializedRef = useRef(false);
  const batchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    if (isInitializedRef.current) return;

    const sessionId = sessionStorage.getItem("earl_session_id");
    const visitorId = localStorage.getItem("stc_visitor_id");

    if (!sessionId || !visitorId) {
      // Wait for tracking to initialize
      const checkInterval = setInterval(() => {
        const sid = sessionStorage.getItem("earl_session_id");
        const vid = localStorage.getItem("stc_visitor_id");
        if (sid && vid) {
          clearInterval(checkInterval);
          initRecording(sid, vid);
        }
      }, 500);

      return () => clearInterval(checkInterval);
    } else {
      initRecording(sessionId, visitorId);
    }

    function initRecording(sessionId: string, visitorId: string) {
      if (isInitializedRef.current) return;
      isInitializedRef.current = true;

      eventsRef.current = [];

      // Initialize session replay on server
      fetch("/api/tracking/replay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "init",
          sessionId,
          visitorId,
          pagePath: window.location.pathname,
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
          pageWidth: document.documentElement.scrollWidth,
          pageHeight: document.documentElement.scrollHeight,
          userAgent: navigator.userAgent,
        }),
      }).catch(console.error);

      // Start rrweb recording (wrapped in try-catch due to alpha instability)
      try {
        const stopFn = record({
          emit: (event) => {
            if (eventsRef.current.length < MAX_EVENTS) {
              eventsRef.current.push(event);
            }
          },
          // Privacy settings
          maskAllInputs: true, // Mask form inputs
          maskTextSelector: "[data-mask]", // Mask elements with data-mask attribute
          blockSelector: "[data-block-replay]", // Don't record these elements
          // Performance settings
          sampling: {
            mousemove: true, // Record mouse movements
            mouseInteraction: true, // Record clicks, focus, etc.
            scroll: 150, // Sample scroll every 150ms
            input: "last", // Only record final input value
          },
          // Record canvas content
          recordCanvas: false,
          // Inline styles for accurate replay
          inlineStylesheet: true,
          // Collect fonts
          collectFonts: false,
        });

        // Store stop function if recording started successfully
        if (stopFn) {
          stopRecordingRef.current = stopFn;
        }
      } catch (err) {
        console.warn("[SessionRecorder] Failed to initialize rrweb:", err);
        return;
      }

      // Batch send interval
      batchIntervalRef.current = setInterval(() => {
        if (eventsRef.current.length > 0) {
          sendBatch(sessionId, visitorId, false);
        }
      }, BATCH_INTERVAL_MS);

      // Handle page unload - send remaining events
      const handleBeforeUnload = () => {
        if (eventsRef.current.length > 0) {
          const data = JSON.stringify({
            action: "batch",
            sessionId,
            visitorId,
            events: eventsRef.current,
            isComplete: true,
          });
          navigator.sendBeacon("/api/tracking/replay", data);
        }
      };

      window.addEventListener("beforeunload", handleBeforeUnload);

      // Cleanup function
      return () => {
        if (stopRecordingRef.current) {
          stopRecordingRef.current();
        }
        if (batchIntervalRef.current) {
          clearInterval(batchIntervalRef.current);
        }
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }

    function sendBatch(sessionId: string, visitorId: string, isComplete: boolean) {
      if (eventsRef.current.length === 0) return;

      const events = [...eventsRef.current];
      eventsRef.current = [];

      fetch("/api/tracking/replay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "batch",
          sessionId,
          visitorId,
          events,
          isComplete,
        }),
      }).catch((err) => {
        // On error, put events back (up to limit)
        eventsRef.current = [...events.slice(0, 1000), ...eventsRef.current].slice(0, MAX_EVENTS);
        console.error("[SessionRecorder] Failed to send batch:", err);
      });
    }
  }, [enabled]);

  return null; // This component doesn't render anything
}
