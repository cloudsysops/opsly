"use client";

import { useEffect } from "react";
import { initScrollTracking } from "@/lib/tracking/eventTracking";

/**
 * Add this component to any page to track scroll depth milestones (25%, 50%, 75%, 100%)
 *
 * Usage:
 * import { ScrollTracker } from "@/components/tracking/ScrollTracker";
 *
 * export default function MyPage() {
 *   return (
 *     <>
 *       <ScrollTracker />
 *       <div>...page content...</div>
 *     </>
 *   );
 * }
 */
export function ScrollTracker() {
  useEffect(() => {
    const cleanup = initScrollTracking();
    return cleanup;
  }, []);

  return null;
}
