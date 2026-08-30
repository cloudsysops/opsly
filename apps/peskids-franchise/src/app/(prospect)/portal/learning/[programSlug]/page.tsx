"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  PlayIcon,
} from "@heroicons/react/24/outline";

export const dynamic = "force-dynamic";

interface Module {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  order: number;
  moduleType: string;
  points: number;
  duration: number | null;
  owner: "FRANCHISEE" | "FRANCHISOR" | "COLLABORATIVE" | null;
  verificationType: string | null;
  targetDay: number | null;
  isMilestone: boolean;
  status: string;
  completedAt: string | null;
}

interface Phase {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  order: number;
  dayStart: number | null;
  dayEnd: number | null;
  modules: Module[];
  completedModules: number;
  totalModules: number;
  progress: number;
  isComplete: boolean;
}

interface ProgramData {
  program: {
    id: string;
    slug: string;
    name: string;
    description: string;
    programType: "ONBOARDING" | "CONTINUING_EDUCATION" | "CERTIFICATION";
  };
  phases: Phase[];
  stats: {
    totalModules: number;
    completedModules: number;
    inProgressModules: number;
    completionPercentage: number;
    totalMilestones: number;
    completedMilestones: number;
    overdueCount: number;
  };
  currentDay: number;
  overdue: Array<{
    id: string;
    slug: string;
    title: string;
    targetDay: number;
    daysOverdue: number;
    phaseSlug: string;
    phaseTitle: string;
  }>;
  nextModule: {
    slug: string;
    title: string;
    phaseSlug: string;
    phaseTitle: string;
  } | null;
  franchiseeName: string;
}

export default function ProgramOverviewPage() {
  const params = useParams();
  const programSlug = params.programSlug as string;

  const [data, setData] = useState<ProgramData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/franchisee/bootcamp/programs/${programSlug}`);
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to fetch program");
        }
        const programData = await res.json();
        setData(programData);
        // Auto-expand the current phase
        const current = programData.phases.find((p: Phase) => !p.isComplete);
        if (current) setExpandedPhase(current.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [programSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-navy" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="p-6 bg-red-50 rounded-xl border border-red-200 text-center">
          <p className="text-red-700">{error || "Program not found"}</p>
          <Link
            href="/portal/learning"
            className="mt-4 inline-block px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-purple"
          >
            Back to Learning Center
          </Link>
        </div>
      </div>
    );
  }

  const isOnboarding = data.program.programType === "ONBOARDING";
  const { stats } = data;
  const progressPct = stats.completionPercentage;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500">
        <Link href="/portal/learning" className="hover:text-brand-purple">
          Learning Center
        </Link>
        <span className="mx-2">/</span>
        <span className="text-brand-navy font-medium">{data.program.name}</span>
      </nav>

      {/* ── Full-width Progress Header ────────────────────────────────── */}
      <div className="bg-gradient-to-r from-brand-navy to-brand-purple rounded-2xl p-5 sm:p-6 text-white">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          {/* Progress ring */}
          <div className="relative w-20 h-20 flex-shrink-0 mx-auto sm:mx-0">
            <svg className="w-full h-full -rotate-90">
              <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="6" />
              <circle
                cx="40" cy="40" r="34" fill="none" stroke="white" strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 34}`}
                strokeDashoffset={`${2 * Math.PI * 34 * (1 - progressPct / 100)}`}
                className="transition-all duration-700"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-bold">{progressPct}%</span>
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-xl sm:text-2xl font-bold">{data.program.name}</h1>
            <p className="text-white/70 text-sm mt-1">
              {isOnboarding
                ? `Day ${data.currentDay} of 90 — ${data.franchiseeName}`
                : data.program.description}
            </p>
          </div>

          {/* Quick stats */}
          <div className="flex items-center justify-center gap-4 sm:gap-6 flex-shrink-0">
            <div className="text-center">
              <div className="text-2xl font-bold">{stats.completedModules}</div>
              <div className="text-xs text-white/60">of {stats.totalModules}</div>
            </div>
            {isOnboarding && (
              <>
                <div className="w-px h-8 bg-white/20" />
                <div className="text-center">
                  <div className="text-2xl font-bold">{stats.completedMilestones}</div>
                  <div className="text-xs text-white/60">of {stats.totalMilestones} milestones</div>
                </div>
                {stats.overdueCount > 0 && (
                  <>
                    <div className="w-px h-8 bg-white/20" />
                    <div className="text-center">
                      <div className="text-2xl font-bold text-red-300">{stats.overdueCount}</div>
                      <div className="text-xs text-red-300/80">overdue</div>
                    </div>
                  </>
                )}
                {stats.inProgressModules > 0 && (
                  <>
                    <div className="w-px h-8 bg-white/20" />
                    <div className="text-center">
                      <div className="text-2xl font-bold text-brand-cyan">{stats.inProgressModules}</div>
                      <div className="text-xs text-white/60">in progress</div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* Full-width progress bar */}
        <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* ── Next Action + Overdue (compact row) ──────────────────────── */}
      {(data.nextModule || data.overdue.length > 0) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Next up */}
          {data.nextModule && (
            <Link
              href={`/portal/learning/${programSlug}/${data.nextModule.phaseSlug}/${data.nextModule.slug}`}
              className="flex-1 flex items-center gap-3 bg-white rounded-xl border border-gray-200 p-4 hover:border-brand-cyan hover:shadow-sm transition-all group"
            >
              <div className="p-2 rounded-lg bg-brand-navy/10 group-hover:bg-brand-cyan/20 transition-colors">
                <PlayIcon className="h-5 w-5 text-brand-navy" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-500 font-medium">Next Up</p>
                <p className="text-sm font-semibold text-brand-navy truncate">{data.nextModule.title}</p>
              </div>
              <ChevronRightIcon className="h-4 w-4 text-gray-400 group-hover:text-brand-navy" />
            </Link>
          )}

          {/* Overdue summary */}
          {data.overdue.length > 0 && (
            <div className="flex items-center gap-3 bg-red-50 rounded-xl border border-red-200 p-4 sm:max-w-xs">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-red-700">
                  {data.overdue.length} overdue task{data.overdue.length > 1 ? "s" : ""}
                </p>
                <p className="text-xs text-red-500 truncate">
                  {data.overdue[0].title}{data.overdue.length > 1 ? ` +${data.overdue.length - 1} more` : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Phases with inline modules ───────────────────────────────── */}
      <div className="space-y-3">
        {data.phases.map((phase, index) => {
          const isCurrent = !phase.isComplete && (index === 0 || data.phases[index - 1].isComplete);
          const isExpanded = expandedPhase === phase.id;

          return (
            <div
              key={phase.id}
              className={`bg-white rounded-xl border overflow-hidden transition-all ${
                isCurrent ? "border-brand-cyan shadow-sm" :
                phase.isComplete ? "border-green-200" : "border-gray-200"
              }`}
            >
              {/* Phase header — clickable to expand/collapse */}
              <button
                onClick={() => setExpandedPhase(isExpanded ? null : phase.id)}
                className="w-full flex items-center gap-3 p-4 text-left hover:bg-gray-50/50 transition-colors"
              >
                {/* Status indicator */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                  phase.isComplete ? "bg-green-500 text-white" :
                  isCurrent ? "bg-brand-cyan text-brand-navy" :
                  "bg-gray-200 text-gray-500"
                }`}>
                  {phase.isComplete ? "✓" : index + 1}
                </div>

                {/* Phase info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-brand-navy text-sm sm:text-base truncate">{phase.title}</h3>
                    {isCurrent && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-cyan/20 text-brand-navy font-medium flex-shrink-0">
                        Current
                      </span>
                    )}
                  </div>
                  {isOnboarding && phase.dayStart && phase.dayEnd && (
                    <p className="text-xs text-gray-400 mt-0.5">Days {phase.dayStart}–{phase.dayEnd}</p>
                  )}
                </div>

                {/* Progress */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="hidden sm:flex items-center gap-2 w-32">
                    <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          phase.isComplete ? "bg-green-500" : "bg-brand-cyan"
                        }`}
                        style={{ width: `${phase.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 w-7 text-right">{phase.progress}%</span>
                  </div>
                  <span className="text-xs text-gray-500">{phase.completedModules}/{phase.totalModules}</span>
                  <ChevronRightIcon className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                </div>
              </button>

              {/* Expanded module list */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-3 space-y-1 bg-gray-50/30">
                  {phase.modules.map((mod) => (
                    <ModuleRow
                      key={mod.id}
                      module={mod}
                      programSlug={programSlug}
                      phaseSlug={phase.slug}
                      currentDay={data.currentDay}
                      isOnboarding={isOnboarding}
                    />
                  ))}
                  <Link
                    href={`/portal/learning/${programSlug}/${phase.slug}`}
                    className="block text-center text-xs font-medium text-brand-purple hover:text-brand-navy py-2 transition-colors"
                  >
                    View full phase →
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ModuleRow({
  module,
  programSlug,
  phaseSlug,
  currentDay,
  isOnboarding,
}: {
  module: Module;
  programSlug: string;
  phaseSlug: string;
  currentDay: number;
  isOnboarding: boolean;
}) {
  const isCompleted = module.status === "COMPLETED";
  const isInProgress = module.status === "IN_PROGRESS";
  const isPendingReview = module.status === "PENDING_REVIEW";
  const targetDay = module.targetDay || 90;
  const daysUntilDue = targetDay - currentDay;
  const isOverdue = daysUntilDue < 0 && !isCompleted;

  const ownerLabel = module.owner === "FRANCHISOR" ? "STC" : module.owner === "COLLABORATIVE" ? "Both" : null;

  return (
    <Link
      href={`/portal/learning/${programSlug}/${phaseSlug}/${module.slug}`}
      className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-white transition-colors group"
    >
      {/* Status icon */}
      {isCompleted ? (
        <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
      ) : isPendingReview ? (
        <ClockIcon className="h-5 w-5 text-yellow-500 flex-shrink-0" />
      ) : isInProgress ? (
        <div className="w-5 h-5 rounded-full border-2 border-blue-500 bg-blue-50 flex-shrink-0" />
      ) : (
        <div className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0 group-hover:border-gray-400" />
      )}

      {/* Title */}
      <div className="flex-1 min-w-0">
        <span className={`text-sm ${isCompleted ? "text-gray-400 line-through" : "text-gray-800"} truncate block`}>
          {module.isMilestone && <span className="mr-1">🏆</span>}
          {module.title}
        </span>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-1.5 flex-shrink-0">
        {ownerLabel && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
            module.owner === "FRANCHISOR" ? "bg-brand-purple/10 text-brand-purple" : "bg-brand-cyan/20 text-brand-navy"
          }`}>
            {ownerLabel}
          </span>
        )}
        {isOnboarding && isOverdue && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
            {Math.abs(daysUntilDue)}d late
          </span>
        )}
        {isOnboarding && !isCompleted && !isOverdue && daysUntilDue <= 3 && daysUntilDue >= 0 && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">
            {daysUntilDue === 0 ? "Today" : `${daysUntilDue}d`}
          </span>
        )}
      </div>

      <ChevronRightIcon className="h-3.5 w-3.5 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
    </Link>
  );
}
