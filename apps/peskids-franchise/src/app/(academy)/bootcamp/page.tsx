"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import AcademyLayout from "@/components/academy/AcademyLayout";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import {
  RocketLaunchIcon,
  BookOpenIcon,
  TrophyIcon,
  CheckCircleIcon,
  SparklesIcon,
  ArrowRightIcon,
  PlayIcon,
  ChatBubbleLeftRightIcon,
} from "@heroicons/react/24/outline";

interface ProgressData {
  status: string;
  current_phase: number;
  total_points: number;
  current_streak_days: number;
  completion_percentage: number;
  modules_completed: number;
  total_modules: number;
  badges_earned: number;
  recent_badges: Array<{ id: string; title: string; earnedAt: string }>;
  next_action: {
    title: string;
    link: string;
    phase: string;
  } | null;
}

export default function AcademyDashboard() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/bootcamp/progress");
      if (response.ok) {
        const data = await response.json();
        setProgress(data);
      } else {
        setProgress({
          status: "not_started",
          current_phase: 1,
          total_points: 0,
          current_streak_days: 0,
          completion_percentage: 0,
          modules_completed: 0,
          total_modules: 9,
          badges_earned: 0,
          recent_badges: [],
          next_action: {
            title: "Welcome to Acme Franchise",
            link: "/bootcamp/journey",
            phase: "Foundation",
          },
        });
      }
    } catch (err) {
      console.error("Error fetching progress:", err);
      setError("Failed to load progress data");
    } finally {
      setLoading(false);
    }
  };

  const quickActions = [
    {
      title: "90-Day Journey",
      description: "Continue your guided onboarding program",
      icon: RocketLaunchIcon,
      color: "navy",
      href: "/bootcamp/journey",
      stat:
        progress?.status === "not_started"
          ? "Get Started"
          : `${progress?.modules_completed || 0}/${progress?.total_modules || 9} Complete`,
    },
    {
      title: "Resource Library",
      description: "SOPs, marketing materials, and guides",
      icon: BookOpenIcon,
      color: "cyan",
      href: "/bootcamp/resources",
      stat: "Browse All",
    },
    {
      title: "AI Coach",
      description: "Get instant answers from Earl",
      icon: ChatBubbleLeftRightIcon,
      color: "purple",
      href: "/bootcamp/coach",
      stat: "Ask Earl",
      badge: "Beta",
    },
    {
      title: "Achievements",
      description: "View your badges and progress",
      icon: TrophyIcon,
      color: "green",
      href: "/bootcamp/achievements",
      stat: `${progress?.badges_earned || 0} Earned`,
    },
  ];

  const getColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      navy: "bg-brand-navy/5 border-brand-navy/20 hover:border-brand-navy/40 text-brand-navy",
      cyan: "bg-[#50C8DF]/10 border-[#50C8DF]/30 hover:border-[#50C8DF]/50 text-[#0891b2]",
      green: "bg-[#34B256]/10 border-[#34B256]/30 hover:border-[#34B256]/50 text-[#16a34a]",
      purple: "bg-[#6A469D]/10 border-[#6A469D]/30 hover:border-[#6A469D]/50 text-[#6A469D]",
    };
    return colors[color] || colors.navy;
  };

  const getIconColorClasses = (color: string) => {
    const colors: Record<string, string> = {
      navy: "bg-brand-navy/10 text-brand-navy",
      cyan: "bg-[#50C8DF]/20 text-[#0891b2]",
      green: "bg-[#34B256]/20 text-[#16a34a]",
      purple: "bg-[#6A469D]/20 text-[#6A469D]",
    };
    return colors[color] || colors.navy;
  };

  const stats = {
    points: progress?.total_points || 0,
    badges: progress?.badges_earned || 0,
    streak: progress?.current_streak_days || 0,
  };

  if (loading) {
    return (
      <AcademyLayout progress={0} stats={stats} user={session?.user}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-navy/20 border-t-brand-navy" />
            <p className="text-slate-500 font-medium">Loading Bootcamp...</p>
          </div>
        </div>
      </AcademyLayout>
    );
  }

  if (error) {
    return (
      <AcademyLayout progress={0} stats={stats} user={session?.user}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="text-red-500 text-lg font-medium mb-2">
              Unable to load Bootcamp
            </div>
            <p className="text-slate-500 mb-4">{error}</p>
            <button
              onClick={fetchProgress}
              className="px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-[#3a3c9e] transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </AcademyLayout>
    );
  }

  const progressPercent = progress?.completion_percentage || 0;

  return (
    <AcademyLayout progress={progressPercent} stats={stats} user={session?.user}>
      <WideContainer className="space-y-6">
        {/* Welcome Section */}
        <div className="bg-gradient-to-r from-brand-navy via-[#3a3c9e] to-[#6366f1] rounded-2xl p-6 sm:p-8 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">
                Welcome to Operations Bootcamp
              </h1>
              <p className="text-blue-100 text-sm sm:text-base max-w-xl">
                Your comprehensive training and resource center. Complete your
                90-day journey to build a successful Acme Franchise.
              </p>
            </div>
            <div className="flex-shrink-0">
              <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4">
                <div className="text-center">
                  <div className="text-4xl font-bold">{progressPercent}%</div>
                  <div className="text-xs text-blue-100 mt-1">Complete</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-brand-navy/10 rounded-lg">
                <SparklesIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-navy" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900">
                  {(progress?.total_points || 0).toLocaleString()}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500">Total Points</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-[#50C8DF]/20 rounded-lg">
                <span className="text-base sm:text-lg">🔥</span>
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900">
                  {progress?.current_streak_days || 0}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500">Day Streak</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-emerald-100 rounded-lg">
                <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-emerald-600" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900">
                  {progress?.modules_completed || 0}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500">Modules Done</div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 shadow-sm">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 bg-[#6A469D]/10 rounded-lg">
                <TrophyIcon className="h-4 w-4 sm:h-5 sm:w-5 text-[#6A469D]" />
              </div>
              <div>
                <div className="text-xl sm:text-2xl font-bold text-slate-900">
                  {progress?.badges_earned || 0}
                </div>
                <div className="text-[10px] sm:text-xs text-slate-500">Badges Earned</div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link
                  key={action.href}
                  href={action.href}
                  className={`
                    relative group rounded-xl border-2 p-4 sm:p-5 transition-all duration-200
                    hover:shadow-md ${getColorClasses(action.color)}
                  `}
                >
                  {"badge" in action && action.badge && (
                    <span className="absolute top-3 right-3 text-[9px] bg-purple-500 text-white px-1.5 py-0.5 rounded font-semibold">
                      {action.badge}
                    </span>
                  )}
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center mb-2 sm:mb-3 ${getIconColorClasses(action.color)}`}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
                  </div>
                  <h3 className="font-semibold text-slate-900 mb-1 text-sm sm:text-base">
                    {action.title}
                  </h3>
                  <p className="text-[10px] sm:text-xs text-slate-500 mb-2 sm:mb-3">
                    {action.description}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm font-medium">{action.stat}</span>
                    <ArrowRightIcon className="h-3 w-3 sm:h-4 sm:w-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Next Action Card */}
        {progress?.next_action && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="p-2 sm:p-3 bg-brand-navy/10 rounded-xl">
                <PlayIcon className="h-5 w-5 sm:h-6 sm:w-6 text-brand-navy" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-1">
                  Recommended Next Step
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 mb-1">
                  {progress.next_action.title}
                </p>
                <p className="text-[10px] sm:text-xs text-slate-400 mb-2 sm:mb-3">
                  Phase: {progress.next_action.phase}
                </p>
                <Link
                  href={progress.next_action.link}
                  className="inline-flex items-center gap-2 px-3 sm:px-4 py-1.5 sm:py-2 bg-brand-navy text-white text-xs sm:text-sm font-medium rounded-lg hover:bg-[#3a3c9e] transition-colors"
                >
                  Continue
                  <ArrowRightIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Get Started CTA (for new franchisees) */}
        {progress?.status === "not_started" && (
          <div className="bg-gradient-to-br from-[#6A469D] to-brand-navy rounded-xl p-6 sm:p-8 text-white shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold mb-2">Ready to Begin?</h3>
                <p className="text-purple-100 text-sm">
                  Start your 90-day journey to franchise success. Our guided
                  program will help you every step of the way.
                </p>
              </div>
              <Link
                href="/bootcamp/journey"
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-[#6A469D] font-semibold rounded-lg hover:bg-purple-50 transition-colors whitespace-nowrap shadow-md"
              >
                <RocketLaunchIcon className="h-5 w-5" />
                Start Journey
              </Link>
            </div>
          </div>
        )}

        {/* Recent Achievements */}
        {progress?.recent_badges && progress.recent_badges.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-slate-900">
                Recent Achievements
              </h3>
              <Link
                href="/bootcamp/achievements"
                className="text-xs sm:text-sm text-brand-navy hover:text-[#6366f1] font-medium"
              >
                View All
              </Link>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3">
              {progress.recent_badges.slice(0, 5).map((badge) => (
                <div
                  key={badge.id}
                  className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 bg-brand-navy/5 border border-brand-navy/20 rounded-lg"
                >
                  <TrophyIcon className="h-4 w-4 sm:h-5 sm:w-5 text-brand-navy" />
                  <span className="text-xs sm:text-sm font-medium text-slate-800">
                    {badge.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </WideContainer>
    </AcademyLayout>
  );
}
