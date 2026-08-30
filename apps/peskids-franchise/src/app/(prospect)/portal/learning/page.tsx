"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  AcademicCapIcon,
  CheckCircleIcon,
  ClockIcon,
  FireIcon,
  ArrowRightIcon,
  PlayIcon,
  SparklesIcon,
  RocketLaunchIcon,
  BookOpenIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolidIcon } from "@heroicons/react/24/solid";

export const dynamic = "force-dynamic";

interface ProgramEnrollment {
  id: string;
  programSlug: string;
  programName: string;
  programDescription: string;
  programType: "ONBOARDING" | "CONTINUING_EDUCATION" | "CERTIFICATION";
  status: "ENROLLED" | "IN_PROGRESS" | "COMPLETED";
  progress: number;
  completedItems: number;
  totalItems: number;
  overdueCount: number;
  nextAction: {
    title: string;
    href: string;
  } | null;
}

interface AcademyStats {
  totalPoints: number;
  earnedPoints: number;
  currentStreak: number;
  earnedBadgesCount: number;
  totalModulesCompleted: number;
}

interface RecentActivity {
  id: string;
  type: string;
  title: string;
  description: string;
  timestamp: string;
  points?: number;
}

interface AcademyDashboardData {
  firstName: string;
  currentDay: number;
  enrollments: ProgramEnrollment[];
  stats: AcademyStats;
  recentActivity: RecentActivity[];
}

// Circular progress ring component
function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  color = "brand",
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
  color?: "brand" | "green";
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  const gradientId = color === "green" ? "progressGradientGreen" : "progressGradient";
  const stopColors = color === "green"
    ? { start: "#22c55e", end: "#16a34a" }
    : { start: "#2D2F8E", end: "#6A469D" };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Progress circle with gradient */}
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={stopColors.start} />
            <stop offset="100%" stopColor={stopColors.end} />
          </linearGradient>
        </defs>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-2xl font-bold ${color === "green" ? "text-green-600" : "text-brand-navy"}`}>
          {progress}%
        </span>
        <span className="text-xs text-gray-500">Complete</span>
      </div>
    </div>
  );
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

// Program type badge
function ProgramTypeBadge({ type }: { type: string }) {
  const config = {
    ONBOARDING: { label: "Onboarding", color: "bg-brand-cyan text-brand-navy" },
    CONTINUING_EDUCATION: { label: "Training", color: "bg-brand-purple text-white" },
    CERTIFICATION: { label: "Certification", color: "bg-yellow-100 text-yellow-800" },
  }[type] || { label: type, color: "bg-gray-100 text-gray-700" };

  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
}

export default function AcademyDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AcademyDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const res = await fetch("/api/franchisee/bootcamp");
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to load academy data");
      }
      const apiData = await res.json();

      setData({
        firstName: apiData.firstName || "Franchisee",
        currentDay: apiData.currentDay || 1,
        enrollments: apiData.enrollments || [],
        stats: apiData.stats || {
          totalPoints: 0,
          earnedPoints: 0,
          currentStreak: 0,
          earnedBadgesCount: 0,
          totalModulesCompleted: 0,
        },
        recentActivity: apiData.recentActivity || [],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load academy data");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-navy"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <AcademicCapIcon className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Learning Center Coming Soon
          </h3>
          <p className="text-gray-600 max-w-md mx-auto">
            Training content is being prepared for your franchise journey.
          </p>
        </div>
      </div>
    );
  }

  const currentProgram = data.enrollments.find(e => e.status !== "COMPLETED") || data.enrollments[0];
  const completedPrograms = data.enrollments.filter(e => e.status === "COMPLETED");
  const onboardingProgram = data.enrollments.find(e => e.programType === "ONBOARDING");

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 pb-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-brand-navy to-brand-purple rounded-2xl p-6 md:p-8 mb-8 text-white">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          {/* Welcome Message and Stats */}
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Welcome to the Learning Center, {data.firstName}!
            </h1>
            <p className="text-white/80 mb-6">
              Your operations training hub for franchise success
            </p>

            {/* Stats Row */}
            <div className="flex flex-wrap gap-4 md:gap-6">
              {/* Streak */}
              <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                <div className="p-2 bg-orange-500 rounded-lg">
                  <FireIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{data.stats.currentStreak}</div>
                  <div className="text-xs text-white/70">Day Streak</div>
                </div>
              </div>

              {/* Modules Completed */}
              <div className="flex items-center gap-3 bg-white/10 rounded-xl px-4 py-3">
                <div className="p-2 bg-green-500 rounded-lg">
                  <CheckCircleIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{data.stats.totalModulesCompleted}</div>
                  <div className="text-xs text-white/70">Completed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Current Program Progress */}
          {currentProgram && (
            <div className="flex justify-center md:justify-end">
              <div className="bg-white rounded-2xl p-4 shadow-lg">
                <ProgressRing
                  progress={currentProgram.progress}
                  size={140}
                  strokeWidth={10}
                  color={currentProgram.status === "COMPLETED" ? "green" : "brand"}
                />
                <div className="text-center mt-2">
                  <span className="text-sm text-gray-600">
                    {currentProgram.completedItems}/{currentProgram.totalItems} items
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Continue Learning CTA */}
      {currentProgram && currentProgram.nextAction && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-brand-light rounded-xl">
                <SparklesIcon className="h-6 w-6 text-brand-navy" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Continue Learning</h3>
                <p className="text-sm text-gray-600">
                  <span className="text-brand-purple font-medium">
                    {currentProgram.programName}
                  </span>{" "}
                  - {currentProgram.nextAction.title}
                </p>
              </div>
            </div>
            <Link
              href={currentProgram.nextAction.href}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-brand-navy text-white rounded-xl hover:bg-brand-purple transition-colors font-medium"
            >
              <PlayIcon className="h-5 w-5" />
              Resume
            </Link>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Programs - 2 columns */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Programs</h2>
          <div className="space-y-4">
            {data.enrollments.map((enrollment) => {
              const isOnboarding = enrollment.programType === "ONBOARDING";
              const Icon = isOnboarding ? RocketLaunchIcon : BookOpenIcon;

              return (
                <Link
                  key={enrollment.id}
                  href={`/portal/learning/${enrollment.programSlug}`}
                  className={`block bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow cursor-pointer ${
                    enrollment.status === "COMPLETED" ? "border-green-200 bg-green-50/30" : "border-gray-200"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl ${
                      enrollment.status === "COMPLETED"
                        ? "bg-green-100"
                        : isOnboarding ? "bg-brand-light" : "bg-purple-50"
                    }`}>
                      {enrollment.status === "COMPLETED" ? (
                        <CheckCircleSolidIcon className="h-6 w-6 text-green-600" />
                      ) : (
                        <Icon className={`h-6 w-6 ${isOnboarding ? "text-brand-navy" : "text-brand-purple"}`} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{enrollment.programName}</h3>
                        <ProgramTypeBadge type={enrollment.programType} />
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{enrollment.programDescription}</p>

                      <div className="mb-3">
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-500">
                            {enrollment.completedItems}/{enrollment.totalItems} completed
                          </span>
                          <span className={`font-semibold ${
                            enrollment.status === "COMPLETED" ? "text-green-600" : "text-brand-navy"
                          }`}>
                            {enrollment.progress}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              enrollment.status === "COMPLETED"
                                ? "bg-green-500"
                                : "bg-gradient-to-r from-brand-navy to-brand-purple"
                            }`}
                            style={{ width: `${enrollment.progress}%` }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        {isOnboarding && (
                          <span className="text-sm text-gray-500">
                            Day {data.currentDay} of 90
                            {enrollment.overdueCount > 0 && (
                              <span className="ml-2 text-red-600 font-medium">
                                ({enrollment.overdueCount} overdue)
                              </span>
                            )}
                          </span>
                        )}
                        {!isOnboarding && <span />}

                        <span
                          className={`inline-flex items-center gap-1 text-sm font-medium ${
                            enrollment.status === "COMPLETED"
                              ? "text-green-600"
                              : "text-brand-navy"
                          }`}
                        >
                          {enrollment.status === "COMPLETED" ? "Review" :
                           enrollment.status === "IN_PROGRESS" ? "Continue" : "Start"}
                          <ArrowRightIcon className="h-4 w-4" />
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

        </div>

        {/* Right Sidebar */}
        <div className="lg:col-span-1 space-y-6">
          {/* Recent Activity */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {data.recentActivity.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {data.recentActivity.map((activity) => (
                    <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex gap-3">
                        {/* Icon */}
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                            activity.type === "module_completed" || activity.type === "task_completed"
                              ? "bg-green-100"
                              : "bg-blue-100"
                          }`}
                        >
                          {activity.type === "module_completed" || activity.type === "task_completed" ? (
                            <CheckCircleIcon className="h-4 w-4 text-green-600" />
                          ) : (
                            <PlayIcon className="h-4 w-4 text-blue-600" />
                          )}
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {activity.title}
                          </p>
                          <p className="text-xs text-gray-500 truncate">
                            {activity.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-400">
                              {formatRelativeTime(activity.timestamp)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-6 text-center">
                  <div className="mx-auto w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                    <ClockIcon className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-500">
                    No recent activity yet. Start learning to see your progress here!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Stats Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Your Stats</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Modules Complete</span>
                <span className="font-semibold text-brand-navy">
                  {data.stats.totalModulesCompleted}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Streak</span>
                <span className="font-semibold text-orange-500">
                  {data.stats.currentStreak} days
                </span>
              </div>
            </div>
          </div>

          {/* Completed Programs */}
          {completedPrograms.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Completed Programs</h3>
              <div className="space-y-3">
                {completedPrograms.map((program) => (
                  <div key={program.id} className="flex items-center gap-3">
                    <CheckCircleSolidIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-sm text-gray-700">{program.programName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
