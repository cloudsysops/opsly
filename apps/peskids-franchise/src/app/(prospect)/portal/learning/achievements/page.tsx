"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { Card, CardHeader, CardContent } from "@/components/shared/Card";
import {
  TrophyIcon,
  StarIcon,
  FireIcon,
  SparklesIcon,
  LockClosedIcon,
  CheckBadgeIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from "@heroicons/react/24/outline";
import {
  TrophyIcon as TrophySolidIcon,
  StarIcon as StarSolidIcon,
} from "@heroicons/react/24/solid";

// ============================================
// Types
// ============================================

interface EarnedBadge {
  id: string;
  slug: string;
  title: string;
  description: string;
  imageUrl: string | null;
  points: number;
  criteria: string;
  earnedAt: string;
}

interface LockedBadge {
  id: string;
  slug: string;
  title: string;
  description: string;
  imageUrl: string | null;
  points: number;
  criteria: string;
  progress: {
    current: number;
    total: number;
    percent: number;
  } | null;
}

interface PointsLogEntry {
  id: string;
  points: number;
  reason: string;
  reasonLabel: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

interface AchievementsData {
  earnedBadges: EarnedBadge[];
  lockedBadges: LockedBadge[];
  totalPoints: number;
  earnedBadgesCount: number;
  totalBadgesCount: number;
  currentStreak: number;
  longestStreak: number;
  recentPointsLog: PointsLogEntry[];
}

// ============================================
// Main Component
// ============================================

export default function AchievementsPage() {
  const [data, setData] = useState<AchievementsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPointsHistory, setShowPointsHistory] = useState(false);

  useEffect(() => {
    fetchAchievements();
  }, []);

  async function fetchAchievements() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/franchisee/bootcamp/achievements");
      const json = await res.json();
      if (json.error) {
        setError(json.error);
        return;
      }
      setData(json);
    } catch (err) {
      console.error("Error fetching achievements:", err);
      setError("Failed to load achievements");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <WideContainer className="space-y-6 py-8">
        <LoadingSkeleton />
      </WideContainer>
    );
  }

  if (error || !data) {
    return (
      <WideContainer className="py-8">
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="font-display text-xl font-bold text-gray-900 mb-2">
              Unable to Load Achievements
            </h2>
            <p className="text-gray-600 mb-4">{error || "Something went wrong."}</p>
            <button
              onClick={() => fetchAchievements()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-navy/90 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      </WideContainer>
    );
  }

  return (
    <WideContainer className="space-y-8 py-8 pb-16">
      {/* ============================================ */}
      {/* HEADER */}
      {/* ============================================ */}
      <div
        className="relative overflow-hidden rounded-3xl p-8"
        style={{
          background: "linear-gradient(135deg, #FACC29 0%, #F79A30 50%, #6A469D 100%)",
        }}
      >
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <pattern id="achieve-grid" width="8" height="8" patternUnits="userSpaceOnUse">
              <path d="M 8 0 L 0 0 0 8" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
            <rect width="100" height="100" fill="url(#achieve-grid)" />
          </svg>
        </div>

        {/* Floating decorative elements */}
        <div className="absolute top-4 right-8 opacity-20">
          <TrophySolidIcon className="w-24 h-24 text-white" />
        </div>
        <div className="absolute bottom-4 right-32 opacity-15">
          <StarSolidIcon className="w-16 h-16 text-white" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
              <TrophyIcon className="w-6 h-6 text-white" />
            </div>
            <h1 className="font-display text-3xl lg:text-4xl font-bold text-white">
              Achievements
            </h1>
          </div>
          <p className="text-white/80 font-body text-lg ml-14">
            Track your progress and earn badges as you complete training
          </p>
        </div>
      </div>

      {/* ============================================ */}
      {/* SUMMARY CARDS */}
      {/* ============================================ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Points */}
        <Card className="border-brand-yellow bg-gradient-to-br from-yellow-50 to-white">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <StarSolidIcon className="h-5 w-5 text-brand-yellow" />
              <span className="text-sm text-gray-500 font-medium">Total Points</span>
            </div>
            <p className="text-3xl font-display font-bold text-brand-yellow">
              {data.totalPoints.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-2">Lifetime earned</p>
          </CardContent>
        </Card>

        {/* Badges Earned */}
        <Card className="border-brand-purple bg-gradient-to-br from-purple-50 to-white">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckBadgeIcon className="h-5 w-5 text-brand-purple" />
              <span className="text-sm text-gray-500 font-medium">Badges Earned</span>
            </div>
            <p className="text-3xl font-display font-bold text-brand-purple">
              {data.earnedBadgesCount}
              <span className="text-base font-normal text-gray-400">
                {" "}/ {data.totalBadgesCount}
              </span>
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {data.totalBadgesCount - data.earnedBadgesCount} remaining
            </p>
          </CardContent>
        </Card>

        {/* Current Streak */}
        <Card className="border-brand-orange bg-gradient-to-br from-orange-50 to-white">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <FireIcon className="h-5 w-5 text-brand-orange" />
              <span className="text-sm text-gray-500 font-medium">Current Streak</span>
            </div>
            <p className="text-3xl font-display font-bold text-brand-orange">
              {data.currentStreak}
              <span className="text-base font-normal text-gray-400"> days</span>
            </p>
            <p className="text-xs text-gray-400 mt-2">
              {data.currentStreak > 0 ? "Keep it going!" : "Start your streak today"}
            </p>
          </CardContent>
        </Card>

        {/* Longest Streak */}
        <Card className="border-emerald-400 bg-gradient-to-br from-emerald-50 to-white">
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 mb-2">
              <SparklesIcon className="h-5 w-5 text-emerald-500" />
              <span className="text-sm text-gray-500 font-medium">Longest Streak</span>
            </div>
            <p className="text-3xl font-display font-bold text-emerald-600">
              {data.longestStreak}
              <span className="text-base font-normal text-gray-400"> days</span>
            </p>
            <p className="text-xs text-gray-400 mt-2">Personal best</p>
          </CardContent>
        </Card>
      </div>

      {/* ============================================ */}
      {/* EARNED BADGES */}
      {/* ============================================ */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-brand-yellow/20 to-brand-orange/20">
              <TrophySolidIcon className="w-5 h-5 text-brand-orange" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-gray-900">
                Earned Badges
              </h2>
              <p className="text-sm text-gray-500">
                {data.earnedBadges.length > 0
                  ? `You've earned ${data.earnedBadges.length} badge${data.earnedBadges.length !== 1 ? "s" : ""}!`
                  : "Complete training to earn your first badge"}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {data.earnedBadges.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <TrophyIcon className="w-8 h-8 text-gray-300" />
              </div>
              <p className="text-gray-500">
                No badges earned yet. Complete training modules to start earning!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.earnedBadges.map((badge) => (
                <EarnedBadgeCard key={badge.id} badge={badge} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ============================================ */}
      {/* LOCKED BADGES */}
      {/* ============================================ */}
      {data.lockedBadges.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gray-100">
                <LockClosedIcon className="w-5 h-5 text-gray-400" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold text-gray-900">
                  Badges to Unlock
                </h2>
                <p className="text-sm text-gray-500">
                  {data.lockedBadges.length} badge{data.lockedBadges.length !== 1 ? "s" : ""} remaining
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.lockedBadges.map((badge) => (
                <LockedBadgeCard key={badge.id} badge={badge} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============================================ */}
      {/* POINTS HISTORY ACCORDION */}
      {/* ============================================ */}
      {data.recentPointsLog.length > 0 && (
        <Card>
          <button
            onClick={() => setShowPointsHistory(!showPointsHistory)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-100 to-cyan-50">
                <StarIcon className="w-5 h-5 text-brand-cyan" />
              </div>
              <div className="text-left">
                <h2 className="font-display text-xl font-bold text-gray-900">
                  Points History
                </h2>
                <p className="text-sm text-gray-500">
                  Recent activity and points earned
                </p>
              </div>
            </div>
            {showPointsHistory ? (
              <ChevronUpIcon className="w-5 h-5 text-gray-400" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-400" />
            )}
          </button>

          {showPointsHistory && (
            <CardContent className="border-t border-gray-100">
              <PointsHistoryList entries={data.recentPointsLog} />
            </CardContent>
          )}
        </Card>
      )}
    </WideContainer>
  );
}

// ============================================
// Sub-Components
// ============================================

function EarnedBadgeCard({ badge }: { badge: EarnedBadge }) {
  const formattedDate = new Date(badge.earnedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="relative group">
      {/* Glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-brand-yellow via-brand-orange to-brand-purple rounded-2xl opacity-30 group-hover:opacity-50 blur transition-opacity" />

      <div className="relative bg-white rounded-2xl p-5 border border-brand-yellow/30 shadow-sm">
        <div className="flex items-start gap-4">
          {/* Badge Icon */}
          <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gradient-to-br from-brand-yellow to-brand-orange flex items-center justify-center shadow-lg">
            {badge.imageUrl ? (
              <img
                src={badge.imageUrl}
                alt={badge.title}
                className="w-10 h-10 object-contain"
              />
            ) : (
              <TrophySolidIcon className="w-8 h-8 text-white" />
            )}
          </div>

          {/* Badge Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-display font-bold text-gray-900 truncate">
              {badge.title}
            </h3>
            <p className="text-sm text-gray-500 line-clamp-2 mt-0.5">
              {badge.description}
            </p>
          </div>
        </div>

        {/* Points and Date */}
        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center gap-1.5">
            <StarSolidIcon className="w-4 h-4 text-brand-yellow" />
            <span className="text-sm font-bold text-brand-yellow">
              +{badge.points} pts
            </span>
          </div>
          <span className="text-xs text-gray-400">
            Earned {formattedDate}
          </span>
        </div>
      </div>
    </div>
  );
}

function LockedBadgeCard({ badge }: { badge: LockedBadge }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-5 border border-gray-200 opacity-75 hover:opacity-90 transition-opacity">
      <div className="flex items-start gap-4">
        {/* Badge Icon (grayed out) */}
        <div className="flex-shrink-0 w-14 h-14 rounded-xl bg-gray-200 flex items-center justify-center">
          {badge.imageUrl ? (
            <img
              src={badge.imageUrl}
              alt={badge.title}
              className="w-10 h-10 object-contain grayscale opacity-50"
            />
          ) : (
            <LockClosedIcon className="w-7 h-7 text-gray-400" />
          )}
        </div>

        {/* Badge Info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-display font-bold text-gray-600 truncate">
            {badge.title}
          </h3>
          <p className="text-sm text-gray-400 line-clamp-2 mt-0.5">
            {badge.description}
          </p>
        </div>
      </div>

      {/* Criteria */}
      <div className="mt-4 pt-4 border-t border-gray-200">
        <p className="text-xs text-gray-500 mb-2">
          <span className="font-medium">How to unlock:</span> {badge.criteria}
        </p>

        {/* Progress bar if available */}
        {badge.progress && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-gray-500">Progress</span>
              <span className="text-gray-600 font-medium">
                {badge.progress.current} / {badge.progress.total}
              </span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-brand-cyan to-brand-green rounded-full transition-all duration-500"
                style={{ width: `${badge.progress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Points value */}
        <div className="flex items-center gap-1.5 mt-3">
          <StarIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-400">
            {badge.points} pts
          </span>
        </div>
      </div>
    </div>
  );
}

function PointsHistoryList({ entries }: { entries: PointsLogEntry[] }) {
  // Group entries by date
  const groupedEntries: Record<string, PointsLogEntry[]> = {};

  entries.forEach((entry) => {
    const date = new Date(entry.createdAt).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    if (!groupedEntries[date]) {
      groupedEntries[date] = [];
    }
    groupedEntries[date].push(entry);
  });

  const reasonIcons: Record<string, React.ReactNode> = {
    MODULE_COMPLETED: <CheckBadgeIcon className="w-4 h-4" />,
    QUIZ_PASSED: <SparklesIcon className="w-4 h-4" />,
    BADGE_EARNED: <TrophyIcon className="w-4 h-4" />,
    STREAK_BONUS: <FireIcon className="w-4 h-4" />,
    PHASE_COMPLETED: <StarIcon className="w-4 h-4" />,
    FIRST_LOGIN: <SparklesIcon className="w-4 h-4" />,
    RESOURCE_VIEWED: <CheckBadgeIcon className="w-4 h-4" />,
  };

  const reasonColors: Record<string, string> = {
    MODULE_COMPLETED: "text-brand-cyan bg-cyan-100",
    QUIZ_PASSED: "text-brand-purple bg-purple-100",
    BADGE_EARNED: "text-brand-orange bg-orange-100",
    STREAK_BONUS: "text-red-500 bg-red-100",
    PHASE_COMPLETED: "text-brand-yellow bg-yellow-100",
    FIRST_LOGIN: "text-brand-green bg-green-100",
    RESOURCE_VIEWED: "text-gray-500 bg-gray-100",
  };

  return (
    <div className="space-y-6">
      {Object.entries(groupedEntries).map(([date, dateEntries]) => (
        <div key={date}>
          <h3 className="text-sm font-medium text-gray-500 mb-3">{date}</h3>
          <div className="space-y-2">
            {dateEntries.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-2 rounded-lg ${reasonColors[entry.reason] || "text-gray-500 bg-gray-100"}`}
                  >
                    {reasonIcons[entry.reason] || <StarIcon className="w-4 h-4" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {entry.reasonLabel}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(entry.createdAt).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <StarSolidIcon className="w-4 h-4 text-brand-yellow" />
                  <span className="text-sm font-bold text-brand-yellow">
                    +{entry.points}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="h-36 bg-gray-200 rounded-3xl" />

      {/* Cards skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 bg-gray-200 rounded-2xl" />
        ))}
      </div>

      {/* Earned badges skeleton */}
      <div className="bg-gray-200 rounded-2xl h-64" />

      {/* Locked badges skeleton */}
      <div className="bg-gray-200 rounded-2xl h-64" />
    </div>
  );
}
