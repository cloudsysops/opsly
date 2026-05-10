import type { CSSProperties, ReactElement } from 'react';
import { cn } from '@/lib/utils';

export interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  animation?: 'pulse' | 'wave' | 'none';
}

export function Skeleton({
  className = '',
  variant = 'text',
  width,
  height,
  animation = 'pulse',
}: SkeletonProps): ReactElement {
  const variantClass =
    variant === 'circular'
      ? 'rounded-full'
      : variant === 'rectangular'
        ? 'rounded-lg'
        : 'rounded-md';

  const animationClass =
    animation === 'pulse' ? 'animate-pulse' : animation === 'wave' ? 'animate-shimmer' : '';

  const style: CSSProperties = {};
  if (width !== undefined) {
    style.width = typeof width === 'number' ? `${width}px` : width;
  }
  if (height !== undefined) {
    style.height = typeof height === 'number' ? `${height}px` : height;
  }
  if (variant === 'text' && height === undefined && style.height === undefined) {
    style.height = '0.875rem';
  }

  return (
    <div
      className={cn('bg-ops-border/60', variantClass, animationClass, className)}
      style={style}
      aria-hidden
    />
  );
}

export function SkeletonCard(): ReactElement {
  return (
    <div className="space-y-3 rounded-xl border border-ops-border bg-ops-surface p-4">
      <Skeleton variant="rectangular" height={20} width="60%" />
      <Skeleton variant="text" />
      <Skeleton variant="text" width="80%" />
      <div className="flex gap-2 pt-2">
        <Skeleton variant="circular" width={32} height={32} />
        <Skeleton variant="circular" width={32} height={32} />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }): ReactElement {
  return (
    <div className="space-y-2">
      <div className="flex gap-4 rounded-md border border-ops-border bg-ops-surface/80 p-3">
        <Skeleton width={150} />
        <Skeleton width={100} />
        <Skeleton width={120} />
        <Skeleton width={80} />
      </div>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex gap-4 rounded-md border border-ops-border bg-ops-surface p-3">
          <Skeleton width={150} />
          <Skeleton width={100} />
          <Skeleton width={120} />
          <Skeleton width={80} />
        </div>
      ))}
    </div>
  );
}
