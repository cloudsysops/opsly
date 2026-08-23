'use client';

import { ReactNode } from 'react';

interface TrackedDownloadLinkProps {
  href: string;
  documentName: string;
  fileName: string;
  fileType?: string;
  source?: string;
  className?: string;
  children: ReactNode;
}

export function TrackedDownloadLink({
  href,
  documentName,
  fileName,
  fileType = 'pdf',
  source,
  className,
  children,
}: TrackedDownloadLinkProps) {
  async function handleClick() {
    // Track the download (fire and forget)
    fetch('/api/tracking/download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName,
        fileType,
        documentName,
        source: source || window.location.pathname,
      }),
    }).catch(console.error);
  }

  return (
    <a
      href={href}
      download
      onClick={handleClick}
      className={className}
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  );
}
