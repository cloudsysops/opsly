"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

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
  dayStart: number | null;
  dayEnd: number | null;
  modules: Module[];
  completedModules: number;
  totalModules: number;
  progress: number;
  isComplete: boolean;
}

interface ProgramInfo {
  slug: string;
  name: string;
  programType: "ONBOARDING" | "CONTINUING_EDUCATION" | "CERTIFICATION";
}

export default function PhaseDetailPage() {
  const params = useParams();
  const programSlug = params.programSlug as string;
  const phaseSlug = params.phaseSlug as string;

  const [program, setProgram] = useState<ProgramInfo | null>(null);
  const [phase, setPhase] = useState<Phase | null>(null);
  const [currentDay, setCurrentDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`/api/franchisee/bootcamp/programs/${programSlug}`);
        if (!res.ok) throw new Error("Failed to fetch program");

        const data = await res.json();
        setProgram(data.program);
        setCurrentDay(data.currentDay);

        const foundPhase = data.phases.find((p: Phase) => p.slug === phaseSlug);
        if (!foundPhase) throw new Error("Phase not found");
        setPhase(foundPhase);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [programSlug, phaseSlug]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-navy" />
      </div>
    );
  }

  if (error || !phase || !program) {
    return (
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="p-6 bg-red-50 rounded-xl border border-red-200 text-center">
          <p className="text-red-700">{error || "Phase not found"}</p>
          <Link
            href={`/portal/learning/${programSlug}`}
            className="mt-4 inline-block px-4 py-2 bg-brand-navy text-white rounded-lg hover:bg-brand-purple"
          >
            Back to Program
          </Link>
        </div>
      </div>
    );
  }

  const isOnboarding = program.programType === "ONBOARDING";

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/portal/learning" className="hover:text-brand-purple">
          Learning Center
        </Link>
        <span className="mx-2">/</span>
        <Link href={`/portal/learning/${programSlug}`} className="hover:text-brand-purple">
          {program.name}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-brand-navy">{phase.title}</span>
      </nav>

      {/* Phase Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          {phase.isComplete && <span className="text-2xl">✅</span>}
          <h1 className="text-3xl font-bold text-brand-navy">{phase.title}</h1>
        </div>
        {phase.description && <p className="text-gray-600">{phase.description}</p>}
        {isOnboarding && phase.dayStart && phase.dayEnd && (
          <p className="text-sm text-brand-purple mt-2">
            Days {phase.dayStart}-{phase.dayEnd}
          </p>
        )}

        {/* Phase Progress Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-600">
              {phase.completedModules} of {phase.totalModules} modules complete
            </span>
            <span className="font-semibold text-brand-navy">{phase.progress}%</span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                phase.isComplete ? "bg-green-500" : "bg-gradient-to-r from-brand-cyan to-brand-green"
              }`}
              style={{ width: `${phase.progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Modules List */}
      <div className="space-y-3">
        {phase.modules.map((module) => (
          <ModuleRow
            key={module.id}
            module={module}
            programSlug={programSlug}
            phaseSlug={phaseSlug}
            currentDay={currentDay}
            isOnboarding={isOnboarding}
          />
        ))}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex justify-between">
        <Link
          href={`/portal/learning/${programSlug}`}
          className="text-brand-purple hover:underline"
        >
          ← Back to {program.name}
        </Link>
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
  const isFranchisorTask = module.owner === "FRANCHISOR";

  const targetDay = module.targetDay || 90;
  const daysUntilDue = targetDay - currentDay;
  const isOverdue = isOnboarding && daysUntilDue < 0 && !isCompleted;
  const isDueSoon = isOnboarding && daysUntilDue >= 0 && daysUntilDue <= 3 && !isCompleted;

  let statusColor = "bg-gray-100 text-gray-600 border-gray-200";
  let statusText = "Not Started";
  let statusIcon = <span className="w-5 h-5 rounded-full border-2 border-gray-300 flex-shrink-0" />;

  if (isCompleted) {
    statusColor = "bg-green-50 text-green-700 border-green-200";
    statusText = "Completed";
    statusIcon = (
      <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs flex-shrink-0">
        ✓
      </span>
    );
  } else if (isPendingReview) {
    statusColor = "bg-yellow-50 text-yellow-700 border-yellow-200";
    statusText = "Awaiting Review";
    statusIcon = (
      <span className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center text-white text-xs flex-shrink-0">
        ⏳
      </span>
    );
  } else if (isInProgress) {
    statusColor = "bg-blue-50 text-blue-700 border-blue-200";
    statusText = "In Progress";
    statusIcon = <span className="w-5 h-5 rounded-full border-2 border-blue-500 bg-blue-100 flex-shrink-0" />;
  } else if (isOverdue) {
    statusColor = "bg-red-50 text-red-700 border-red-200";
    statusText = `${Math.abs(daysUntilDue)} day${Math.abs(daysUntilDue) > 1 ? "s" : ""} overdue`;
    statusIcon = <span className="w-5 h-5 rounded-full border-2 border-red-500 flex-shrink-0" />;
  } else if (isDueSoon) {
    statusColor = "bg-orange-50 text-orange-700 border-orange-200";
    statusText = daysUntilDue === 0 ? "Due today" : `Due in ${daysUntilDue} day${daysUntilDue > 1 ? "s" : ""}`;
    statusIcon = <span className="w-5 h-5 rounded-full border-2 border-orange-400 flex-shrink-0" />;
  }

  const ownerBadge = module.owner
    ? {
        FRANCHISEE: { text: "Your Task", color: "bg-brand-navy text-white" },
        FRANCHISOR: { text: "STC Task", color: "bg-brand-purple text-white" },
        COLLABORATIVE: { text: "Joint Task", color: "bg-brand-cyan text-brand-navy" },
      }[module.owner]
    : null;

  return (
    <Link
      href={`/portal/learning/${programSlug}/${phaseSlug}/${module.slug}`}
      className={`block p-4 rounded-xl border ${statusColor} hover:shadow-md transition-shadow`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">{statusIcon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {module.isMilestone && <span className="text-lg" title="Milestone">🏆</span>}
            <h4 className={`font-semibold ${isCompleted ? "line-through opacity-60" : ""}`}>
              {module.title}
            </h4>
          </div>

          {module.description && (
            <p className="text-sm opacity-75 line-clamp-2 mb-2">{module.description}</p>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {ownerBadge && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${ownerBadge.color}`}>
                {ownerBadge.text}
              </span>
            )}
            {module.verificationType === "FILE_UPLOAD" && (
              <span className="text-xs text-gray-500">📎 File required</span>
            )}
            {module.verificationType === "TEXT_RESPONSE" && (
              <span className="text-xs text-gray-500">✏️ Response required</span>
            )}
            {module.verificationType === "FRANCHISOR_CONFIRMS" && (
              <span className="text-xs text-gray-500">👤 STC confirms</span>
            )}
            {module.targetDay && !isCompleted && isOnboarding && (
              <span className="text-xs opacity-75">Day {module.targetDay}</span>
            )}
          </div>
        </div>

        <div className="text-xs font-medium whitespace-nowrap">{statusText}</div>
      </div>
    </Link>
  );
}
