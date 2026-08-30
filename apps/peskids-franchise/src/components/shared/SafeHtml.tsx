"use client";

/**
 * Renders trusted HTML content from the admin CMS (TipTap editor).
 * Only used for content authored by authenticated admin users.
 */
export function SafeHtml({
  html,
  className = "prose prose-sm max-w-none prose-headings:text-brand-navy prose-a:text-brand-cyan",
}: {
  html: string;
  className?: string;
}) {
  // Content originates from admin CMS (TipTap) — trusted source
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}
