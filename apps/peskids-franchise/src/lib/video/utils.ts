export type VideoProvider = "youtube" | "loom" | "unknown";

export interface VideoInfo {
  provider: VideoProvider;
  videoId: string | null;
  embedUrl: string | null;
  thumbnailUrl: string | null;
}

/**
 * Detects the video provider from a URL
 */
export function detectVideoProvider(url: string): VideoProvider {
  if (!url) return "unknown";

  const lowerUrl = url.toLowerCase();

  if (
    lowerUrl.includes("youtube.com") ||
    lowerUrl.includes("youtu.be") ||
    lowerUrl.includes("youtube-nocookie.com")
  ) {
    return "youtube";
  }

  if (lowerUrl.includes("loom.com")) {
    return "loom";
  }

  return "unknown";
}

/**
 * Extracts YouTube video ID from various URL formats
 * Supports:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * - https://www.youtube-nocookie.com/embed/VIDEO_ID
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;

  // Handle youtu.be short URLs
  const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];

  // Handle standard watch URLs
  const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];

  // Handle embed URLs
  const embedMatch = url.match(/(?:youtube\.com|youtube-nocookie\.com)\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];

  return null;
}

/**
 * Extracts Loom video ID from URL
 * Supports:
 * - https://www.loom.com/share/VIDEO_ID
 * - https://www.loom.com/embed/VIDEO_ID
 */
export function extractLoomId(url: string): string | null {
  if (!url) return null;

  const match = url.match(/loom\.com\/(?:share|embed)\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Generates YouTube embed URL with privacy-enhanced mode
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  // Use youtube-nocookie.com for enhanced privacy
  return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&enablejsapi=1`;
}

/**
 * Generates Loom embed URL
 */
export function getLoomEmbedUrl(videoId: string): string {
  return `https://www.loom.com/embed/${videoId}?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`;
}

/**
 * Gets YouTube thumbnail URL
 */
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
}

/**
 * Gets Loom thumbnail URL
 */
export function getLoomThumbnail(videoId: string): string {
  return `https://cdn.loom.com/sessions/thumbnails/${videoId}-with-play.gif`;
}

/**
 * Parses a video URL and returns all relevant information
 */
export function parseVideoUrl(url: string): VideoInfo {
  const provider = detectVideoProvider(url);

  if (provider === "youtube") {
    const videoId = extractYouTubeId(url);
    return {
      provider,
      videoId,
      embedUrl: videoId ? getYouTubeEmbedUrl(videoId) : null,
      thumbnailUrl: videoId ? getYouTubeThumbnail(videoId) : null,
    };
  }

  if (provider === "loom") {
    const videoId = extractLoomId(url);
    return {
      provider,
      videoId,
      embedUrl: videoId ? getLoomEmbedUrl(videoId) : null,
      thumbnailUrl: videoId ? getLoomThumbnail(videoId) : null,
    };
  }

  return {
    provider: "unknown",
    videoId: null,
    embedUrl: null,
    thumbnailUrl: null,
  };
}
