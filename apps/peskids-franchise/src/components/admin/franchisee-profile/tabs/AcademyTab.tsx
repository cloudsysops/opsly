"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  AcademicCapIcon,
  TrophyIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { ConfirmModal } from "@/components/shared/ConfirmModal";

interface AcademyProgressItem {
  id: string;
  status: string;
  completedAt?: string | Date | null;
  module: {
    id: string;
    title: string;
    slug: string;
    isMilestone: boolean;
    phase: {
      title: string;
      slug: string;
      program: {
        name: string;
        slug: string;
      };
    };
  };
}

interface Badge {
  id: string;
  earnedAt: string | Date;
  badge: {
    id: string;
    slug: string;
    title: string;
    description: string;
    points: number;
  };
}

interface Enrollment {
  id: string;
  programId: string;
  status: string;
  enrolledAt: string;
  program: {
    id: string;
    name: string;
    slug: string;
    programType: string;
    isActive: boolean;
  };
}

interface AvailableProgram {
  id: string;
  name: string;
  slug: string;
  programType: string;
}

interface AcademyTabProps {
  franchisee: {
    id: string;
    selectedAt?: string | Date | null;
    academyProgress?: AcademyProgressItem[];
    earnedBadges?: Badge[];
  };
}

const programTypeLabels: Record<string, { label: string; color: string }> = {
  ONBOARDING: { label: "Onboarding", color: "bg-emerald-100 text-emerald-700" },
  CONTINUING_EDUCATION: { label: "Continuing Ed", color: "bg-blue-100 text-blue-700" },
  CERTIFICATION: { label: "Certification", color: "bg-purple-100 text-purple-700" },
};

export default function AcademyTab({ franchisee }: AcademyTabProps) {
  const progress = franchisee.academyProgress || [];
  const badges = franchisee.earnedBadges || [];

  // Enrollment state
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [availablePrograms, setAvailablePrograms] = useState<AvailableProgram[]>([]);
  const [enrollLoading, setEnrollLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedProgramId, setSelectedProgramId] = useState("");
  const [removeTarget, setRemoveTarget] = useState<Enrollment | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [resetting, setResetting] = useState(false);

  const fetchEnrollments = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/franchisees/${franchisee.id}/enrollments`);
      if (res.ok) {
        const data = await res.json();
        setEnrollments(data.enrollments || []);
        setAvailablePrograms(data.availablePrograms || []);
      }
    } catch (err) {
      console.error("Failed to fetch enrollments:", err);
    } finally {
      setEnrollLoading(false);
    }
  }, [franchisee.id]);

  useEffect(() => {
    fetchEnrollments();
  }, [fetchEnrollments]);

  const handleEnroll = async () => {
    if (!selectedProgramId) return;
    setEnrolling(true);
    try {
      const res = await fetch(`/api/admin/franchisees/${franchisee.id}/enrollments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ programId: selectedProgramId }),
      });
      if (res.ok) {
        setSelectedProgramId("");
        await fetchEnrollments();
      }
    } catch (err) {
      console.error("Failed to enroll:", err);
    } finally {
      setEnrolling(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    try {
      const res = await fetch(`/api/admin/franchisees/${franchisee.id}/enrollments`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enrollmentId: removeTarget.id }),
      });
      if (res.ok) {
        setRemoveTarget(null);
        await fetchEnrollments();
      }
    } catch (err) {
      console.error("Failed to remove enrollment:", err);
    }
  };

  const handleResetJourney = async () => {
    setResetting(true);
    try {
      const res = await fetch(`/api/admin/franchisees/${franchisee.id}/reset-journey`, {
        method: "POST",
      });
      if (res.ok) {
        setShowResetConfirm(false);
        // Reload page to reflect changes
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to reset journey:", err);
    } finally {
      setResetting(false);
    }
  };

  // Progress stats
  const completedTasks = progress.filter((p) => p.status === "COMPLETED").length;
  const inProgressTasks = progress.filter(
    (p) => p.status === "IN_PROGRESS" || p.status === "PENDING_REVIEW"
  ).length;
  const totalTasks = progress.length || 1;
  const progressPercent = Math.round((completedTasks / totalTasks) * 100);

  const selectedAt = franchisee.selectedAt ? new Date(franchisee.selectedAt) : null;
  const daysSinceSelection = selectedAt
    ? Math.floor((Date.now() - selectedAt.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const currentDay = Math.min(daysSinceSelection + 1, 90);

  // Group progress by phase
  const phases: Record<string, AcademyProgressItem[]> = {};
  progress.forEach((p) => {
    const phaseName = p.module.phase.title;
    if (!phases[phaseName]) {
      phases[phaseName] = [];
    }
    phases[phaseName].push(p);
  });

  const totalPoints = badges.reduce((sum, b) => sum + b.badge.points, 0);

  return (
    <div className="space-y-6">
      {/* Enrolled Programs */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <AcademicCapIcon className="h-5 w-5 text-gray-400" />
            Enrolled Programs
          </h3>
          <button
            onClick={() => setShowResetConfirm(true)}
            className="text-xs px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
          >
            Reset Journey to Day 1
          </button>
        </div>

        {enrollLoading ? (
          <div className="flex justify-center py-6">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-brand-navy" />
          </div>
        ) : (
          <>
            {enrollments.length > 0 ? (
              <div className="space-y-3 mb-4">
                {enrollments.map((enrollment) => {
                  const typeInfo = programTypeLabels[enrollment.program.programType];
                  return (
                    <div
                      key={enrollment.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-navy/10 rounded-lg flex items-center justify-center">
                          <AcademicCapIcon className="h-5 w-5 text-brand-navy" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">
                            {enrollment.program.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                typeInfo?.color || "bg-gray-100 text-gray-600"
                              }`}
                            >
                              {typeInfo?.label || enrollment.program.programType}
                            </span>
                            <span className="text-xs text-gray-400">
                              Enrolled {new Date(enrollment.enrolledAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setRemoveTarget(enrollment)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove enrollment"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-gray-500 text-sm text-center py-4 mb-4">
                No programs assigned yet. Enroll this franchisee in a program below.
              </p>
            )}

            {/* Enroll in new program */}
            {availablePrograms.length > 0 && (
              <div className="flex items-center gap-2 pt-3 border-t border-gray-200">
                <select
                  value={selectedProgramId}
                  onChange={(e) => setSelectedProgramId(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-navy focus:border-brand-navy"
                >
                  <option value="">Select a program...</option>
                  {availablePrograms.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({programTypeLabels[p.programType]?.label || p.programType})
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleEnroll}
                  disabled={!selectedProgramId || enrolling}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-brand-navy rounded-lg hover:bg-brand-navy/90 disabled:opacity-50 transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  {enrolling ? "Enrolling..." : "Enroll"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Progress Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <AcademicCapIcon className="h-4 w-4" />
            Overall Progress
          </div>
          <p className="text-2xl font-bold text-gray-900">{progressPercent}%</p>
          <p className="text-sm text-gray-500 mt-1">
            {completedTasks} of {totalTasks} modules
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <ClockIcon className="h-4 w-4" />
            Current Day
          </div>
          <p className="text-2xl font-bold text-gray-900">Day {currentDay}</p>
          <p className="text-sm text-gray-500 mt-1">since selection</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <CheckCircleIcon className="h-4 w-4" />
            In Progress
          </div>
          <p className="text-2xl font-bold text-gray-900">{inProgressTasks}</p>
          <p className="text-sm text-gray-500 mt-1">modules active</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <TrophyIcon className="h-4 w-4" />
            Badges Earned
          </div>
          <p className="text-2xl font-bold text-gray-900">{badges.length}</p>
          <p className="text-sm text-gray-500 mt-1">{totalPoints} points</p>
        </div>
      </div>

      {/* Progress Ring */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Learning Progress</h3>
        <div className="flex items-center gap-8">
          <div className="relative w-32 h-32 flex-shrink-0">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="12"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                fill="none"
                stroke="#2D2F8E"
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 56}
                strokeDashoffset={2 * Math.PI * 56 * (1 - progressPercent / 100)}
                className="transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-gray-900">{progressPercent}%</span>
            </div>
          </div>

          <div className="flex-1 space-y-3">
            {Object.entries(phases).map(([phaseName, phaseItems]) => {
              const completed = phaseItems.filter((t) => t.status === "COMPLETED").length;
              const total = phaseItems.length;
              const phasePercent = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <div key={phaseName}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="font-medium text-gray-700">{phaseName}</span>
                    <span className="text-gray-500">
                      {completed}/{total}
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-brand-navy rounded-full transition-all duration-300"
                      style={{ width: `${phasePercent}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {Object.keys(phases).length === 0 && (
              <p className="text-gray-500 text-sm">No progress started yet.</p>
            )}
          </div>
        </div>
      </div>

      {/* Earned Badges */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Earned Badges</h3>
        {badges.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {badges.map((earned) => (
              <div
                key={earned.id}
                className="flex flex-col items-center p-4 bg-gray-50 rounded-lg text-center"
              >
                <div className="w-12 h-12 bg-brand-yellow/20 rounded-full flex items-center justify-center mb-2">
                  <TrophyIcon className="h-6 w-6 text-brand-yellow" />
                </div>
                <p className="font-medium text-gray-900 text-sm">{earned.badge.title}</p>
                <p className="text-xs text-gray-500 mt-1">{earned.badge.points} points</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No badges earned yet.</p>
        )}
      </div>

      {/* Recent Module Activity */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Module Activity</h3>
        {progress.filter((p) => p.completedAt).length > 0 ? (
          <div className="space-y-3">
            {progress
              .filter((p) => p.completedAt)
              .sort(
                (a, b) =>
                  new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime()
              )
              .slice(0, 10)
              .map((p) => (
                <div
                  key={p.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      p.module.isMilestone ? "bg-brand-yellow/20" : "bg-green-100"
                    }`}
                  >
                    {p.module.isMilestone ? (
                      <TrophyIcon className="h-4 w-4 text-brand-yellow" />
                    ) : (
                      <CheckCircleIcon className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 text-sm truncate">
                      {p.module.title}
                    </p>
                    <p className="text-xs text-gray-500">
                      {p.module.phase.title} - {p.module.phase.program.name}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {p.completedAt
                      ? new Date(p.completedAt).toLocaleDateString()
                      : ""}
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No modules completed yet.</p>
        )}
      </div>

      {/* Remove enrollment confirmation */}
      <ConfirmModal
        isOpen={!!removeTarget}
        title="Remove Enrollment"
        message={`Remove this franchisee from "${removeTarget?.program.name}"? Their progress will be preserved but they won't see this program in their portal.`}
        confirmLabel="Remove"
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />

      {/* Reset journey confirmation */}
      <ConfirmModal
        isOpen={showResetConfirm}
        title="Reset 90-Day Journey"
        message="This will reset their selection date to today (Day 1), delete all module progress, and reset enrollment statuses. This cannot be undone."
        confirmLabel={resetting ? "Resetting..." : "Reset to Day 1"}
        cancelLabel="Cancel"
        confirmVariant="danger"
        onConfirm={handleResetJourney}
        onCancel={() => setShowResetConfirm(false)}
      />
    </div>
  );
}
