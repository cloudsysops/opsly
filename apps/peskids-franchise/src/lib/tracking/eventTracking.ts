/**
 * Client-side event tracking utilities
 * Tracks custom user interactions: video plays, downloads, FAQ opens, scroll depth, etc.
 */

export type EventType =
  | "VIDEO_PLAY"
  | "VIDEO_PAUSE"
  | "VIDEO_COMPLETE"
  | "VIDEO_PROGRESS"
  | "DOWNLOAD"
  | "FAQ_OPEN"
  | "FAQ_CLOSE"
  | "SCROLL_MILESTONE"
  | "BUTTON_CLICK"
  | "LINK_CLICK"
  | "FORM_FOCUS"
  | "FORM_ABANDON"
  | "CTA_CLICK"
  | "SHARE_CLICK"
  | "CHAT_OPEN"
  | "CHAT_MESSAGE"
  | "TERRITORY_SEARCH"
  | "CALENDAR_CLICK"
  | "ACCORDION_TOGGLE"
  | "TAB_SWITCH"
  | "MODAL_OPEN"
  | "MODAL_CLOSE";

interface BaseEventData {
  eventType: EventType;
  eventName: string;
  eventCategory?: string;
  pagePath?: string;
  elementId?: string;
  elementText?: string;
  metadata?: Record<string, unknown>;
}

interface VideoEventData extends BaseEventData {
  mediaUrl?: string;
  mediaDuration?: number;
  mediaPosition?: number;
}

interface DownloadEventData extends BaseEventData {
  fileName?: string;
  fileType?: string;
}

interface ScrollEventData extends BaseEventData {
  scrollDepth: number;
}

type EventData = BaseEventData | VideoEventData | DownloadEventData | ScrollEventData;

// Get session and visitor IDs from localStorage
function getTrackingIds(): { sessionId: string | null; visitorId: string | null } {
  if (typeof window === "undefined") {
    return { sessionId: null, visitorId: null };
  }
  return {
    sessionId: sessionStorage.getItem("stc_session_id"),
    visitorId: localStorage.getItem("stc_visitor_id"),
  };
}

// Send event to tracking API
async function sendEvent(data: EventData): Promise<void> {
  const { sessionId, visitorId } = getTrackingIds();

  if (!sessionId || !visitorId) {
    console.warn("[EventTracking] Missing session or visitor ID");
    return;
  }

  try {
    await fetch("/api/tracking", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event: "custom_event",
        sessionId,
        visitorId,
        data: {
          ...data,
          pagePath: data.pagePath || window.location.pathname,
        },
      }),
    });
  } catch (error) {
    console.error("[EventTracking] Failed to send event:", error);
  }
}

// ============================================
// VIDEO TRACKING
// ============================================

export function trackVideoPlay(
  mediaUrl: string,
  mediaDuration?: number,
  videoTitle?: string
): void {
  sendEvent({
    eventType: "VIDEO_PLAY",
    eventName: "video_play",
    eventCategory: "engagement",
    mediaUrl,
    mediaDuration,
    metadata: { videoTitle },
  });
}

export function trackVideoPause(
  mediaUrl: string,
  mediaPosition: number,
  mediaDuration?: number
): void {
  sendEvent({
    eventType: "VIDEO_PAUSE",
    eventName: "video_pause",
    eventCategory: "engagement",
    mediaUrl,
    mediaPosition,
    mediaDuration,
  });
}

export function trackVideoComplete(
  mediaUrl: string,
  mediaDuration?: number,
  videoTitle?: string
): void {
  sendEvent({
    eventType: "VIDEO_COMPLETE",
    eventName: "video_complete",
    eventCategory: "engagement",
    mediaUrl,
    mediaDuration,
    metadata: { videoTitle },
  });
}

export function trackVideoProgress(
  mediaUrl: string,
  mediaPosition: number,
  mediaDuration: number,
  percentMilestone: 25 | 50 | 75
): void {
  sendEvent({
    eventType: "VIDEO_PROGRESS",
    eventName: `video_progress_${percentMilestone}`,
    eventCategory: "engagement",
    mediaUrl,
    mediaPosition,
    mediaDuration,
    metadata: { percentMilestone },
  });
}

// ============================================
// DOWNLOAD TRACKING
// ============================================

export function trackDownload(
  fileName: string,
  fileType: string,
  downloadUrl?: string
): void {
  sendEvent({
    eventType: "DOWNLOAD",
    eventName: "file_download",
    eventCategory: "conversion",
    fileName,
    fileType,
    metadata: { downloadUrl },
  });
}

// ============================================
// FAQ / ACCORDION TRACKING
// ============================================

export function trackFAQOpen(questionText: string, questionId?: string): void {
  sendEvent({
    eventType: "FAQ_OPEN",
    eventName: "faq_open",
    eventCategory: "engagement",
    elementId: questionId,
    elementText: questionText.slice(0, 100), // Truncate long questions
  });
}

export function trackFAQClose(questionText: string, questionId?: string): void {
  sendEvent({
    eventType: "FAQ_CLOSE",
    eventName: "faq_close",
    eventCategory: "engagement",
    elementId: questionId,
    elementText: questionText.slice(0, 100),
  });
}

export function trackAccordionToggle(
  title: string,
  isOpen: boolean,
  elementId?: string
): void {
  sendEvent({
    eventType: "ACCORDION_TOGGLE",
    eventName: isOpen ? "accordion_open" : "accordion_close",
    eventCategory: "engagement",
    elementId,
    elementText: title.slice(0, 100),
    metadata: { isOpen },
  });
}

// ============================================
// SCROLL DEPTH TRACKING
// ============================================

// Track scroll milestones: 25%, 50%, 75%, 100%
const scrollMilestones = new Set<number>();

export function initScrollTracking(): () => void {
  if (typeof window === "undefined") return () => {};

  // Reset milestones for new page
  scrollMilestones.clear();

  const handleScroll = () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = Math.round((scrollTop / docHeight) * 100);

    const milestones = [25, 50, 75, 100];
    for (const milestone of milestones) {
      if (scrollPercent >= milestone && !scrollMilestones.has(milestone)) {
        scrollMilestones.add(milestone);
        sendEvent({
          eventType: "SCROLL_MILESTONE",
          eventName: `scroll_${milestone}`,
          eventCategory: "engagement",
          scrollDepth: milestone,
          metadata: { actualScrollPercent: scrollPercent },
        });
      }
    }
  };

  // Throttle scroll events
  let ticking = false;
  const throttledScroll = () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleScroll();
        ticking = false;
      });
      ticking = true;
    }
  };

  window.addEventListener("scroll", throttledScroll, { passive: true });

  // Return cleanup function
  return () => {
    window.removeEventListener("scroll", throttledScroll);
    scrollMilestones.clear();
  };
}

// ============================================
// BUTTON & LINK TRACKING
// ============================================

export function trackButtonClick(
  buttonText: string,
  buttonId?: string,
  buttonType?: string
): void {
  sendEvent({
    eventType: "BUTTON_CLICK",
    eventName: "button_click",
    eventCategory: "engagement",
    elementId: buttonId,
    elementText: buttonText,
    metadata: { buttonType },
  });
}

export function trackCTAClick(
  ctaText: string,
  ctaId?: string,
  ctaLocation?: string
): void {
  sendEvent({
    eventType: "CTA_CLICK",
    eventName: "cta_click",
    eventCategory: "conversion",
    elementId: ctaId,
    elementText: ctaText,
    metadata: { ctaLocation },
  });
}

export function trackLinkClick(
  linkText: string,
  linkUrl: string,
  isExternal: boolean
): void {
  sendEvent({
    eventType: "LINK_CLICK",
    eventName: isExternal ? "external_link_click" : "internal_link_click",
    eventCategory: "navigation",
    elementText: linkText,
    metadata: { linkUrl, isExternal },
  });
}

// ============================================
// FORM TRACKING
// ============================================

export function trackFormFocus(formId: string, fieldName: string): void {
  sendEvent({
    eventType: "FORM_FOCUS",
    eventName: "form_focus",
    eventCategory: "conversion",
    elementId: formId,
    metadata: { fieldName },
  });
}

export function trackFormAbandon(
  formId: string,
  lastFieldFocused?: string,
  fieldsCompleted?: number
): void {
  sendEvent({
    eventType: "FORM_ABANDON",
    eventName: "form_abandon",
    eventCategory: "conversion",
    elementId: formId,
    metadata: { lastFieldFocused, fieldsCompleted },
  });
}

// ============================================
// CHAT TRACKING
// ============================================

export function trackChatOpen(): void {
  sendEvent({
    eventType: "CHAT_OPEN",
    eventName: "chat_open",
    eventCategory: "engagement",
  });
}

export function trackChatMessage(messageLength: number): void {
  sendEvent({
    eventType: "CHAT_MESSAGE",
    eventName: "chat_message_sent",
    eventCategory: "engagement",
    metadata: { messageLength },
  });
}

// ============================================
// TERRITORY / SEARCH TRACKING
// ============================================

export function trackTerritorySearch(
  searchQuery: string,
  resultsCount?: number
): void {
  sendEvent({
    eventType: "TERRITORY_SEARCH",
    eventName: "territory_search",
    eventCategory: "conversion",
    metadata: { searchQuery, resultsCount },
  });
}

// ============================================
// MODAL TRACKING
// ============================================

export function trackModalOpen(modalName: string, modalId?: string): void {
  sendEvent({
    eventType: "MODAL_OPEN",
    eventName: "modal_open",
    eventCategory: "engagement",
    elementId: modalId,
    elementText: modalName,
  });
}

export function trackModalClose(
  modalName: string,
  modalId?: string,
  timeOpen?: number
): void {
  sendEvent({
    eventType: "MODAL_CLOSE",
    eventName: "modal_close",
    eventCategory: "engagement",
    elementId: modalId,
    elementText: modalName,
    metadata: { timeOpen },
  });
}

// ============================================
// TAB SWITCH TRACKING
// ============================================

export function trackTabSwitch(
  tabName: string,
  tabIndex: number,
  tabGroupId?: string
): void {
  sendEvent({
    eventType: "TAB_SWITCH",
    eventName: "tab_switch",
    eventCategory: "navigation",
    elementId: tabGroupId,
    elementText: tabName,
    metadata: { tabIndex },
  });
}

// ============================================
// CALENDAR / BOOKING TRACKING
// ============================================

export function trackCalendarClick(calendarType?: string): void {
  sendEvent({
    eventType: "CALENDAR_CLICK",
    eventName: "calendar_click",
    eventCategory: "conversion",
    metadata: { calendarType },
  });
}

// ============================================
// SHARE TRACKING
// ============================================

export function trackShareClick(
  platform: string,
  contentUrl?: string,
  contentTitle?: string
): void {
  sendEvent({
    eventType: "SHARE_CLICK",
    eventName: `share_${platform.toLowerCase()}`,
    eventCategory: "engagement",
    metadata: { platform, contentUrl, contentTitle },
  });
}
