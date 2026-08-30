"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import AcademyLayout from "@/components/academy/AcademyLayout";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import { TrophyIcon, LockClosedIcon, SparklesIcon } from "@heroicons/react/24/outline";
import { TrophyIcon as TrophySolid } from "@heroicons/react/24/solid";

interface Badge {
  id: string;
  slug: string;
  title: string;
  description: string;
  points: number;
  criteria: string;
  earned: boolean;
  earnedAt: string | null;
}

interface AchievementsData {
  badges: Badge[];
  totalPoints: number;
  earnedCount: number;
}

export default function AchievementsPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AchievementsData | null>(null);
  const [stats, setStats] = useState({ points: 0, badges: 0, streak: 0 });

  useEffect(() => {
    fetchAchievements();
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/bootcamp/progress");
      if (response.ok) {
        const data = await response.json();
        setStats({
          points: data.total_points || 0,
          badges: data.badges_earned || 0,
          streak: data.current_streak_days || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const fetchAchievements = async () => {
    try {
      const response = await fetch("/api/bootcamp/achievements");
      if (response.ok) {
        const result = await response.json();
        setData(result);
      } else {
        // Fallback data
        setData({
          badges: [],
          totalPoints: 0,
          earnedCount: 0,
        });
      }
    } catch (error) {
      console.error("Error fetching achievements:", error);
      setData({
        badges: [],
        totalPoints: 0,
        earnedCount: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AcademyLayout progress={0} stats={stats} user={session?.user}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-navy/20 border-t-brand-navy" />
            <p className="text-slate-500 font-medium">Loading Achievements...</p>
          </div>
        </div>
      </AcademyLayout>
    );
  }

  const earnedBadges = data?.badges.filter((b) => b.earned) || [];
  const lockedBadges = data?.badges.filter((b) => !b.earned) || [];

  return (
    <AcademyLayout progress={0} stats={stats} user={session?.user}>
      <WideContainer className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Achievements</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Track your progress and earn badges as you complete the Bootcamp
          </p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-gradient-to-br from-brand-navy to-[#6A469D] rounded-xl p-4 sm:p-6 text-white">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <SparklesIcon className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-300" />
              <span className="text-xs sm:text-sm font-medium text-blue-200">Total Points</span>
            </div>
            <div className="text-2xl sm:text-4xl font-bold">
              {(data?.totalPoints || 0).toLocaleString()}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <TrophySolid className="h-5 w-5 sm:h-6 sm:w-6 text-[#F79A30]" />
              <span className="text-xs sm:text-sm font-medium text-slate-500">Badges Earned</span>
            </div>
            <div className="text-2xl sm:text-4xl font-bold text-slate-900">
              {data?.earnedCount || 0}
              <span className="text-sm sm:text-lg text-slate-400 font-normal">
                /{data?.badges.length || 0}
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm col-span-2 lg:col-span-1">
            <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
              <div className="text-xl sm:text-2xl">🎯</div>
              <span className="text-xs sm:text-sm font-medium text-slate-500">Progress</span>
            </div>
            <div className="text-2xl sm:text-4xl font-bold text-slate-900">
              {data?.badges.length
                ? Math.round(((data?.earnedCount || 0) / data.badges.length) * 100)
                : 0}
              %
            </div>
            <div className="mt-2 h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#F79A30] to-[#FACC29] rounded-full transition-all"
                style={{
                  width: `${data?.badges.length ? Math.round(((data?.earnedCount || 0) / data.badges.length) * 100) : 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Earned Badges */}
        {earnedBadges.length > 0 && (
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
              <TrophySolid className="h-4 w-4 sm:h-5 sm:w-5 text-[#F79A30]" />
              Earned Badges
            </h2>
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {earnedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="bg-gradient-to-br from-[#F79A30]/10 to-[#FACC29]/10 rounded-xl border-2 border-[#F79A30]/30 p-4 sm:p-5 relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 w-16 sm:w-20 h-16 sm:h-20 bg-[#F79A30]/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                  <div className="relative">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br from-[#F79A30] to-[#FACC29] flex items-center justify-center shadow-lg">
                        <TrophySolid className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-900 text-sm sm:text-base">{badge.title}</h3>
                        <p className="text-[10px] sm:text-xs text-[#F79A30] font-medium">
                          +{badge.points} points
                        </p>
                      </div>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-600 mb-1 sm:mb-2">{badge.description}</p>
                    {badge.earnedAt && (
                      <p className="text-[10px] sm:text-xs text-slate-400">
                        Earned {new Date(badge.earnedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locked Badges */}
        {lockedBadges.length > 0 && (
          <div>
            <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4 flex items-center gap-2">
              <LockClosedIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
              Badges to Unlock
            </h2>
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {lockedBadges.map((badge) => (
                <div
                  key={badge.id}
                  className="bg-slate-50 rounded-xl border border-slate-200 p-4 sm:p-5 relative"
                >
                  <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-slate-200 flex items-center justify-center">
                      <LockClosedIcon className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-600 text-sm sm:text-base">{badge.title}</h3>
                      <p className="text-[10px] sm:text-xs text-slate-400 font-medium">
                        +{badge.points} points
                      </p>
                    </div>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 mb-1 sm:mb-2">{badge.description}</p>
                  <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-200">
                    <p className="text-[10px] sm:text-xs text-slate-400">
                      <span className="font-medium">How to earn:</span> {badge.criteria}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {data?.badges.length === 0 && (
          <div className="text-center py-8 sm:py-12 bg-white rounded-xl border border-slate-200">
            <TrophyIcon className="h-12 w-12 sm:h-16 sm:w-16 text-slate-300 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1 sm:mb-2">
              No badges yet
            </h3>
            <p className="text-sm sm:text-base text-slate-500 max-w-md mx-auto px-4">
              Complete modules in your 90-Day Journey to start earning badges and
              points!
            </p>
          </div>
        )}
      </WideContainer>
    </AcademyLayout>
  );
}
