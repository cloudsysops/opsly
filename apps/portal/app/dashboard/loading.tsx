import type { ReactElement } from "react";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

export default function DashboardLoading(): ReactElement {
  return (
    <div className="min-h-screen bg-ops-bg">
      <header className="sticky top-0 z-10 border-b border-ops-border/80 bg-ops-bg/90 px-4 py-4 backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Skeleton variant="rectangular" height={24} width={96} className="rounded-sm" />
          <Skeleton variant="rectangular" height={32} width={120} className="rounded-sm" />
        </div>
      </header>
      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6 sm:py-10">
        <div className="space-y-2">
          <Skeleton variant="rectangular" height={22} width="55%" className="max-w-md" />
          <Skeleton variant="text" width="70%" className="max-w-lg" />
        </div>
        <SkeletonCard />
        <div className="grid gap-4 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <Skeleton variant="rectangular" height={120} className="w-full rounded-lg" />
      </div>
    </div>
  );
}
