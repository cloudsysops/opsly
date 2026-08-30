"use client";

import { ReactNode } from "react";
import { trackDownload } from "@/lib/tracking/eventTracking";

interface TrackedDownloadLinkProps {
  href: string;
  fileName: string;
  fileType?: string;
  children: ReactNode;
  className?: string;
  download?: boolean | string;
}

/**
 * A download link that tracks when users download files
 *
 * Usage:
 * <TrackedDownloadLink
 *   href="/files/franchise-brochure.pdf"
 *   fileName="Franchise Brochure"
 *   fileType="pdf"
 *   className="text-brand-cyan hover:underline"
 * >
 *   Download Brochure
 * </TrackedDownloadLink>
 */
export function TrackedDownloadLink({
  href,
  fileName,
  fileType,
  children,
  className = "",
  download = true,
}: TrackedDownloadLinkProps) {
  const handleClick = () => {
    // Extract file type from URL if not provided
    const type = fileType || href.split(".").pop()?.toLowerCase() || "unknown";
    trackDownload(fileName, type, href);
  };

  return (
    <a
      href={href}
      download={download}
      onClick={handleClick}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}

interface TrackedDownloadButtonProps {
  href: string;
  fileName: string;
  fileType?: string;
  children: ReactNode;
  className?: string;
}

/**
 * A button-styled download link that tracks when users download files
 */
export function TrackedDownloadButton({
  href,
  fileName,
  fileType,
  children,
  className = "",
}: TrackedDownloadButtonProps) {
  const handleClick = () => {
    const type = fileType || href.split(".").pop()?.toLowerCase() || "unknown";
    trackDownload(fileName, type, href);

    // Trigger download
    const link = document.createElement("a");
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <button onClick={handleClick} className={className} type="button">
      {children}
    </button>
  );
}
