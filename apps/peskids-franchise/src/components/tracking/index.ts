// Tracking components
export { ScrollTracker } from "./ScrollTracker";
export { TrackedVideo, TrackedYouTubeEmbed, TrackedLoomEmbed } from "./TrackedVideo";
export { TrackedDownloadLink, TrackedDownloadButton } from "./TrackedDownload";
export { TrackedAccordionItem, TrackedFAQList } from "./TrackedAccordion";
export { SessionRecorder } from "./SessionRecorder";

// Event tracking functions (re-export from lib for convenience)
export {
  trackVideoPlay,
  trackVideoPause,
  trackVideoComplete,
  trackVideoProgress,
  trackDownload,
  trackFAQOpen,
  trackFAQClose,
  trackAccordionToggle,
  initScrollTracking,
  trackButtonClick,
  trackCTAClick,
  trackLinkClick,
  trackFormFocus,
  trackFormAbandon,
  trackChatOpen,
  trackChatMessage,
  trackTerritorySearch,
  trackModalOpen,
  trackModalClose,
  trackTabSwitch,
  trackCalendarClick,
  trackShareClick,
} from "@/lib/tracking/eventTracking";
