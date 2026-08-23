'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowDownIcon, ArrowUpIcon } from '@heroicons/react/24/outline';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const PULL_THRESHOLD = 80;
const MAX_PULL = 120;

export default function PullToRefresh({ onRefresh, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const startY = useRef(0);
  const isPulling = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Detect touch device on mount
  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (isRefreshing) return;

      // Only activate when scrolled to top
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop > 0) return;

      startY.current = e.touches[0].clientY;
      isPulling.current = true;
    },
    [isRefreshing]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isPulling.current || isRefreshing) return;

      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      if (scrollTop > 0) {
        isPulling.current = false;
        setPullDistance(0);
        return;
      }

      const currentY = e.touches[0].clientY;
      const distance = currentY - startY.current;

      if (distance > 0) {
        // Apply resistance curve - gets harder to pull as distance increases
        const dampedDistance = Math.min(distance * 0.5, MAX_PULL);
        setPullDistance(dampedDistance);

        // Prevent overscroll on iOS
        if (distance > 10) {
          e.preventDefault();
        }
      } else {
        isPulling.current = false;
        setPullDistance(0);
      }
    },
    [isRefreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!isPulling.current || isRefreshing) return;
    isPulling.current = false;

    if (pullDistance >= PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD * 0.5); // Hold at indicator position

      try {
        await onRefresh();
      } catch (err) {
        console.error('Pull-to-refresh error:', err);
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullDistance, isRefreshing, onRefresh]);

  // Don't render pull indicator on non-touch devices
  if (!isTouchDevice) {
    return <>{children}</>;
  }

  const isPastThreshold = pullDistance >= PULL_THRESHOLD;
  const indicatorOpacity = Math.min(pullDistance / (PULL_THRESHOLD * 0.6), 1);
  const indicatorScale = Math.min(0.5 + (pullDistance / PULL_THRESHOLD) * 0.5, 1);

  return (
    <div
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: pullDistance > 0 ? 'none' : 'auto' }}
    >
      {/* Pull indicator */}
      <div
        className="flex items-center justify-center overflow-hidden transition-[height] pointer-events-none"
        style={{
          height: pullDistance > 5 ? `${pullDistance}px` : '0px',
          transitionDuration: isPulling.current ? '0ms' : '300ms',
          transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <div
          className="flex items-center gap-2 text-sm"
          style={{
            opacity: indicatorOpacity,
            transform: `scale(${indicatorScale})`,
            transition: isPulling.current ? 'none' : 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        >
          {isRefreshing ? (
            <>
              <div
                className="w-5 h-5 rounded-full border-2 border-gray-300 animate-spin"
                style={{ borderTopColor: '#2D2F8E' }}
              />
              <span className="text-gray-500 font-medium">Refreshing...</span>
            </>
          ) : isPastThreshold ? (
            <>
              <ArrowUpIcon className="w-4 h-4 text-brand-navy" />
              <span className="text-gray-600 font-medium">Release to refresh</span>
            </>
          ) : (
            <>
              <ArrowDownIcon className="w-4 h-4 text-gray-400" />
              <span className="text-gray-400 font-medium">Pull to refresh</span>
            </>
          )}
        </div>
      </div>

      {/* Content with transform for pull effect */}
      <div
        style={{
          transform: pullDistance > 5 && !isRefreshing ? `translateY(0)` : 'translateY(0)',
          transition: isPulling.current ? 'none' : 'transform 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {children}
      </div>
    </div>
  );
}
