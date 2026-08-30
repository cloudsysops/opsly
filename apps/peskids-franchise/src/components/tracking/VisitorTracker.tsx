"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Storage keys
const VISITOR_ID_KEY = "stc_visitor_id";
const SESSION_ID_KEY = "earl_session_id"; // Same key Earl chat uses for consistency

// Heartbeat interval (30 seconds)
const HEARTBEAT_INTERVAL = 30000;

// Page type detection based on path
function getPageType(path: string): string {
  if (path === "/") return "home";
  if (path.startsWith("/about")) return "about";
  if (path.startsWith("/contact")) return "contact";
  if (path.startsWith("/faq")) return "faq";
  if (path.startsWith("/territory")) return "territory";
  if (path.startsWith("/business-model")) return "business-model";
  if (path.startsWith("/portal")) return "portal";
  if (path.startsWith("/admin")) return "admin";
  return "other";
}

// Device detection
function getDeviceInfo() {
  if (typeof window === "undefined") return null;

  const ua = navigator.userAgent;

  // Device type
  let deviceType = "desktop";
  if (/Mobile|Android|iPhone|iPad|iPod/i.test(ua)) {
    deviceType = /iPad|Tablet/i.test(ua) ? "tablet" : "mobile";
  }

  // Browser detection
  let browser = "unknown";
  let browserVersion = "";
  if (ua.includes("Chrome") && !ua.includes("Edg")) {
    browser = "Chrome";
    browserVersion = ua.match(/Chrome\/(\d+)/)?.[1] || "";
  } else if (ua.includes("Safari") && !ua.includes("Chrome")) {
    browser = "Safari";
    browserVersion = ua.match(/Version\/(\d+)/)?.[1] || "";
  } else if (ua.includes("Firefox")) {
    browser = "Firefox";
    browserVersion = ua.match(/Firefox\/(\d+)/)?.[1] || "";
  } else if (ua.includes("Edg")) {
    browser = "Edge";
    browserVersion = ua.match(/Edg\/(\d+)/)?.[1] || "";
  }

  // OS detection
  let os = "unknown";
  let osVersion = "";
  if (ua.includes("Windows")) {
    os = "Windows";
    osVersion = ua.match(/Windows NT (\d+\.\d+)/)?.[1] || "";
  } else if (ua.includes("Mac OS X")) {
    os = "macOS";
    osVersion = ua.match(/Mac OS X (\d+[._]\d+)/)?.[1]?.replace("_", ".") || "";
  } else if (ua.includes("iPhone") || ua.includes("iPad")) {
    os = "iOS";
    osVersion = ua.match(/OS (\d+_\d+)/)?.[1]?.replace("_", ".") || "";
  } else if (ua.includes("Android")) {
    os = "Android";
    osVersion = ua.match(/Android (\d+\.?\d*)/)?.[1] || "";
  } else if (ua.includes("Linux")) {
    os = "Linux";
  }

  return {
    deviceType,
    browser,
    browserVersion,
    os,
    osVersion,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

// Parse UTM parameters from URL
function getUTMParams(searchParams: URLSearchParams) {
  return {
    utmSource: searchParams.get("utm_source"),
    utmMedium: searchParams.get("utm_medium"),
    utmCampaign: searchParams.get("utm_campaign"),
    utmTerm: searchParams.get("utm_term"),
    utmContent: searchParams.get("utm_content"),
  };
}

// Get referrer domain
function getReferrerDomain(referrer: string): string | null {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    // Don't count internal referrers
    if (url.hostname === window.location.hostname) return null;
    return url.hostname;
  } catch {
    return null;
  }
}

// Generate unique ID
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

// Send tracking event to API
async function sendTrackingEvent(event: Record<string, unknown>) {
  try {
    await fetch("/api/tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(event),
      // Use keepalive for page unload events
      keepalive: true,
    });
  } catch (error) {
    // Silently fail - tracking shouldn't break user experience
    console.debug("Tracking event failed:", error);
  }
}

export function VisitorTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const visitorIdRef = useRef<string | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const sessionStartedRef = useRef(false);
  const currentPageRef = useRef<string | null>(null);
  const pageEnteredAtRef = useRef<number>(Date.now());
  const sessionStartTimeRef = useRef<number>(Date.now());
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize visitor and session IDs
  const initializeIds = useCallback(() => {
    // Visitor ID - long-lived, persists forever
    let visitorId = localStorage.getItem(VISITOR_ID_KEY);
    if (!visitorId) {
      visitorId = generateId("visitor");
      localStorage.setItem(VISITOR_ID_KEY, visitorId);
    }
    visitorIdRef.current = visitorId;

    // Session ID - per browser session (sessionStorage)
    // Also sync to localStorage for Earl chat compatibility
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    if (!sessionId) {
      sessionId = generateId("session");
      sessionStorage.setItem(SESSION_ID_KEY, sessionId);
      // Also store in localStorage for Earl chat
      localStorage.setItem(SESSION_ID_KEY, sessionId);
    }
    sessionIdRef.current = sessionId;

    return { visitorId, sessionId };
  }, []);

  // Start session
  const startSession = useCallback(() => {
    if (sessionStartedRef.current) return;

    const { visitorId, sessionId } = initializeIds();
    const deviceInfo = getDeviceInfo();
    const utmParams = getUTMParams(searchParams);
    const referrer = document.referrer;

    sessionStartTimeRef.current = Date.now();
    sessionStartedRef.current = true;

    sendTrackingEvent({
      event: "session_start",
      visitorId,
      sessionId,
      data: {
        ...utmParams,
        referrer: referrer || null,
        referrerDomain: getReferrerDomain(referrer),
        landingPage: pathname,
        ...deviceInfo,
      },
    });
  }, [initializeIds, pathname, searchParams]);

  // Track page view
  const trackPageView = useCallback((pagePath: string, previousPage: string | null) => {
    if (!visitorIdRef.current || !sessionIdRef.current) return;

    pageEnteredAtRef.current = Date.now();

    sendTrackingEvent({
      event: "page_view",
      visitorId: visitorIdRef.current,
      sessionId: sessionIdRef.current,
      data: {
        pagePath,
        pageTitle: document.title,
        pageType: getPageType(pagePath),
        previousPage,
      },
    });
  }, []);

  // Track page exit
  const trackPageExit = useCallback((pagePath: string) => {
    if (!visitorIdRef.current || !sessionIdRef.current) return;

    const duration = Math.round((Date.now() - pageEnteredAtRef.current) / 1000);

    // Calculate scroll depth
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollDepth = scrollHeight > 0
      ? Math.round((window.scrollY / scrollHeight) * 100)
      : 100;

    sendTrackingEvent({
      event: "page_exit",
      visitorId: visitorIdRef.current,
      sessionId: sessionIdRef.current,
      data: {
        pagePath,
        duration,
        scrollDepth,
      },
    });
  }, []);

  // Send heartbeat
  const sendHeartbeat = useCallback(() => {
    if (!visitorIdRef.current || !sessionIdRef.current || !currentPageRef.current) return;

    const sessionDuration = Math.round((Date.now() - sessionStartTimeRef.current) / 1000);

    sendTrackingEvent({
      event: "heartbeat",
      visitorId: visitorIdRef.current,
      sessionId: sessionIdRef.current,
      data: {
        currentPage: currentPageRef.current,
        sessionDuration,
      },
    });
  }, []);

  // Initialize on mount
  useEffect(() => {
    startSession();

    // Start heartbeat
    heartbeatIntervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Handle page unload
    const handleUnload = () => {
      if (currentPageRef.current) {
        trackPageExit(currentPageRef.current);
      }
    };

    // Handle visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.hidden && currentPageRef.current) {
        trackPageExit(currentPageRef.current);
      }
    };

    window.addEventListener("beforeunload", handleUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [startSession, sendHeartbeat, trackPageExit]);

  // Track page changes (Next.js navigation)
  useEffect(() => {
    const previousPage = currentPageRef.current;

    // Track exit from previous page
    if (previousPage && previousPage !== pathname) {
      trackPageExit(previousPage);
    }

    // Track new page view
    currentPageRef.current = pathname;
    trackPageView(pathname, previousPage);
  }, [pathname, trackPageView, trackPageExit]);

  // This component doesn't render anything
  return null;
}
