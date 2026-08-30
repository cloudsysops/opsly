"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import AcademyLayout from "@/components/academy/AcademyLayout";
import { WideContainer } from "@/components/shared/ResponsiveContainer";
import {
  CheckCircleIcon,
  PlayCircleIcon,
  LockClosedIcon,
  ClockIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import { CheckCircleIcon as CheckCircleSolid } from "@heroicons/react/24/solid";

interface Module {
  id: string;
  slug: string;
  title: string;
  description: string;
  duration: number;
  points: number;
  moduleType: string;
  status: string;
  completedAt: string | null;
}

interface Phase {
  id: string;
  slug: string;
  title: string;
  description: string;
  order: number;
  duration: string;
  modules: Module[];
  completedModules: number;
  totalModules: number;
  progress: number;
  isComplete: boolean;
}

export default function JourneyPage() {
  const { data: session } = useSession();
  const [loading, setLoading] = useState(true);
  const [phases, setPhases] = useState<Phase[]>([]);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [stats, setStats] = useState({ points: 0, badges: 0, streak: 0 });

  useEffect(() => {
    fetchPhases();
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

  const fetchPhases = async () => {
    try {
      const response = await fetch("/api/bootcamp/phases");
      if (response.ok) {
        const data = await response.json();
        setPhases(data.phases);

        // Calculate overall progress
        const totalModules = data.phases.reduce(
          (sum: number, p: Phase) => sum + p.totalModules,
          0
        );
        const completedModules = data.phases.reduce(
          (sum: number, p: Phase) => sum + p.completedModules,
          0
        );
        setOverallProgress(
          totalModules > 0
            ? Math.round((completedModules / totalModules) * 100)
            : 0
        );

        // Auto-expand the first incomplete phase
        const incompletePhase = data.phases.find((p: Phase) => !p.isComplete);
        if (incompletePhase) {
          setExpandedPhase(incompletePhase.id);
        }
      }
    } catch (error) {
      console.error("Error fetching phases:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPhaseStatusIcon = (phase: Phase, index: number) => {
    if (phase.isComplete) {
      return <CheckCircleSolid className="h-6 w-6 text-emerald-500" />;
    }
    if (phase.completedModules > 0) {
      return <PlayCircleIcon className="h-6 w-6 text-brand-navy" />;
    }
    // Check if previous phases are complete
    const previousComplete =
      index === 0 || phases.slice(0, index).every((p) => p.isComplete);
    if (!previousComplete) {
      return <LockClosedIcon className="h-6 w-6 text-slate-400" />;
    }
    return <PlayCircleIcon className="h-6 w-6 text-slate-400" />;
  };

  const getModuleStatusIcon = (status: string) => {
    if (status === "COMPLETED") {
      return <CheckCircleSolid className="h-5 w-5 text-emerald-500" />;
    }
    if (status === "IN_PROGRESS") {
      return <PlayCircleIcon className="h-5 w-5 text-brand-navy" />;
    }
    return <div className="h-5 w-5 rounded-full border-2 border-slate-300" />;
  };

  if (loading) {
    return (
      <AcademyLayout progress={0} stats={stats} user={session?.user}>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-brand-navy/20 border-t-brand-navy" />
            <p className="text-slate-500 font-medium">Loading Journey...</p>
          </div>
        </div>
      </AcademyLayout>
    );
  }

  return (
    <AcademyLayout progress={overallProgress} stats={stats} user={session?.user}>
      <WideContainer className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">90-Day Journey</h1>
          <p className="text-sm sm:text-base text-slate-600 mt-1">
            Complete each phase to build your franchise foundation
          </p>
        </div>

        {/* Progress Overview */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 sm:p-6 shadow-sm">
          <div className="flex items-center justify-between mb-3 sm:mb-4">
            <div>
              <h2 className="font-semibold text-slate-900 text-sm sm:text-base">Overall Progress</h2>
              <p className="text-xs sm:text-sm text-slate-500">
                {phases.reduce((sum, p) => sum + p.completedModules, 0)} of{" "}
                {phases.reduce((sum, p) => sum + p.totalModules, 0)} modules
                completed
              </p>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-brand-navy">
              {overallProgress}%
            </div>
          </div>
          <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-navy to-[#6A469D] rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Phases */}
        <div className="space-y-4">
          {phases.map((phase, index) => {
            const isExpanded = expandedPhase === phase.id;
            const isLocked =
              index > 0 && !phases.slice(0, index).every((p) => p.isComplete);

            return (
              <div
                key={phase.id}
                className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
                  phase.isComplete
                    ? "border-emerald-200"
                    : isLocked
                      ? "border-slate-200 opacity-75"
                      : "border-slate-200"
                }`}
              >
                {/* Phase Header */}
                <button
                  onClick={() =>
                    !isLocked &&
                    setExpandedPhase(isExpanded ? null : phase.id)
                  }
                  disabled={isLocked}
                  className={`w-full px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between ${
                    isLocked
                      ? "cursor-not-allowed"
                      : "cursor-pointer hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-100 flex-shrink-0">
                      {getPhaseStatusIcon(phase, index)}
                    </div>
                    <div className="text-left min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                        <h3 className="font-semibold text-slate-900 text-sm sm:text-base">
                          Phase {index + 1}: {phase.title}
                        </h3>
                        {phase.isComplete && (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-medium rounded-full self-start">
                            Complete
                          </span>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-slate-500">{phase.duration}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-medium text-slate-900">
                        {phase.completedModules}/{phase.totalModules} modules
                      </div>
                      <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1">
                        <div
                          className={`h-full rounded-full ${
                            phase.isComplete
                              ? "bg-emerald-500"
                              : "bg-brand-navy"
                          }`}
                          style={{ width: `${phase.progress}%` }}
                        />
                      </div>
                    </div>
                    <ChevronRightIcon
                      className={`h-5 w-5 text-slate-400 transition-transform ${
                        isExpanded ? "rotate-90" : ""
                      }`}
                    />
                  </div>
                </button>

                {/* Phase Content */}
                {isExpanded && (
                  <div className="px-4 sm:px-6 pb-4 border-t border-slate-100">
                    <p className="py-3 sm:py-4 text-xs sm:text-sm text-slate-600">
                      {phase.description}
                    </p>
                    <div className="space-y-2">
                      {phase.modules.map((module) => (
                        <Link
                          key={module.id}
                          href={`/bootcamp/journey/${phase.slug}/${module.slug}`}
                          className={`block p-3 sm:p-4 rounded-lg border transition-colors ${
                            module.status === "COMPLETED"
                              ? "bg-emerald-50 border-emerald-200 hover:border-emerald-300"
                              : "bg-slate-50 border-slate-200 hover:border-brand-navy/30 hover:bg-brand-navy/5"
                          }`}
                        >
                          <div className="flex items-start sm:items-center justify-between gap-3">
                            <div className="flex items-start sm:items-center gap-2 sm:gap-3 min-w-0">
                              <div className="mt-0.5 sm:mt-0 flex-shrink-0">{getModuleStatusIcon(module.status)}</div>
                              <div className="min-w-0">
                                <h4 className="font-medium text-slate-900 text-sm">
                                  {module.title}
                                </h4>
                                <p className="text-xs text-slate-500 line-clamp-1 hidden sm:block">
                                  {module.description}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-slate-500 flex-shrink-0">
                              <span className="flex items-center gap-1 hidden sm:flex">
                                <ClockIcon className="h-4 w-4" />
                                {module.duration} min
                              </span>
                              <span className="px-2 py-0.5 bg-white rounded text-xs font-medium">
                                {module.points} pts
                              </span>
                              <ChevronRightIcon className="h-4 w-4" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </WideContainer>
    </AcademyLayout>
  );
}
